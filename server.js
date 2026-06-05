require('dotenv').config({
  path: process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env'
});

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { Client } = require('ssh2');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url);
    if (pathname === '/ws/terminal') {
      // TCP Nagle 알고리즘 비활성화 → 소량 패킷(키입력) 즉시 전송
      socket.setNoDelay(true);
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const vpnIp = url.searchParams.get('vpnIp');
    const termType = url.searchParams.get('type') || 'core'; // 'core' | 'firewall'

    if (!vpnIp) {
      ws.send(JSON.stringify({ type: 'error', msg: 'vpnIp가 없습니다.' }));
      ws.close();
      return;
    }

    const isFirewall = termType === 'firewall';
    const sshPort     = isFirewall ? parseInt(process.env.VESSEL_SSH22_PORT)  : parseInt(process.env.VESSEL_SSH_PORT);
    const sshUser     = isFirewall ? (process.env.VESSEL_FW_SSH_USER || 'root') : process.env.VESSEL_SSH_USER;
    const sshPassword = isFirewall ? process.env.VESSEL_SSH2_PASSWORD           : process.env.VESSEL_SSH_PASSWORD;

    const conn = new Client();

    // shell 스트림 — ready 전에는 null
    let shellStream = null;

    // keyboard-interactive 상태
    let kbFinish = null;
    let kbBuffer = '';

    // ── 메시지 핸들러를 connect() 이전에 등록
    // firewall의 keyboard-interactive 단계에서도 입력을 받아야 하므로
    ws.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg);

        if (parsed.type === 'resize') {
          if (shellStream) shellStream.setWindow(parsed.rows, parsed.cols, 0, 0);
          return;
        }

        if (parsed.type !== 'input') return;

        // keyboard-interactive 비밀번호 입력 처리
        if (kbFinish) {
          const chars = Buffer.from(parsed.data, 'base64').toString('utf8');
          for (const ch of chars) {
            if (ch === '\r' || ch === '\n') {
              // Enter: 개행 echo 후 finish 호출
              ws.send(JSON.stringify({ type: 'data', data: Buffer.from('\r\n').toString('base64') }));
              const cb = kbFinish;
              kbFinish = null;
              cb([kbBuffer]);
              kbBuffer = '';
            } else if (ch === '\x7f' || ch === '\x08') {
              // Backspace
              if (kbBuffer.length > 0) kbBuffer = kbBuffer.slice(0, -1);
            } else {
              kbBuffer += ch; // 비밀번호는 echo하지 않음
            }
          }
          return;
        }

        // 일반 shell 입력
        if (shellStream) shellStream.write(Buffer.from(parsed.data, 'base64'));
      } catch (e) {
        console.error('메시지 파싱 오류:', e);
      }
    });

    // keyboard-interactive: env 비밀번호 실패 시 터미널에서 직접 입력
    conn.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
      kbBuffer = '';
      kbFinish = finish;
      if (instructions) {
        ws.send(JSON.stringify({ type: 'data', data: Buffer.from(instructions + '\r\n').toString('base64') }));
      }
      prompts.forEach((p) => {
        ws.send(JSON.stringify({ type: 'data', data: Buffer.from(p.prompt).toString('base64') }));
      });
    });

    conn.on('ready', () => {
      ws.send(JSON.stringify({ type: 'status', msg: 'Connected' }));

      conn.shell({ term: 'xterm-256color', cols: 220, rows: 50 }, (err, stream) => {
        if (err) {
          ws.send(JSON.stringify({ type: 'error', msg: err.message }));
          conn.end();
          return;
        }

        shellStream = stream;

        stream.on('data', (data) => {
          ws.send(JSON.stringify({ type: 'data', data: data.toString('base64') }));
        });

        stream.stderr.on('data', (data) => {
          ws.send(JSON.stringify({ type: 'data', data: data.toString('base64') }));
        });

        stream.on('close', () => {
          ws.send(JSON.stringify({ type: 'status', msg: '세션 종료' }));
          ws.close();
          conn.end();
        });
      });
    });

    conn.on('error', (err) => {
      ws.send(JSON.stringify({ type: 'error', msg: `SSH 오류: ${err.message}` }));
      ws.close();
    });

    conn.connect({
      host: vpnIp,
      port: sshPort,
      username: sshUser,
      password: sshPassword,
      tryKeyboard: isFirewall, // firewall만 keyboard-interactive fallback 활성화
      hostVerifier: () => true,
      readyTimeout: isFirewall ? 60000 : 10000, // firewall: 사용자 입력 대기 시간 확보
    });

    ws.on('close', () => {
      conn.end();
    });
  });

  server.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});