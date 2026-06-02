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
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const vpnIp = url.searchParams.get('vpnIp');

    if (!vpnIp) {
      ws.send(JSON.stringify({ type: 'error', msg: 'vpnIp가 없습니다.' }));
      ws.close();
      return;
    }

    const conn = new Client();

    conn.on('ready', () => {
      ws.send(JSON.stringify({ type: 'status', msg: '선박 접속 완료' }));

      conn.shell(
        {
          term: 'xterm-256color',
          cols: 220,
          rows: 50,
        },
        (err, stream) => {
          if (err) {
            ws.send(JSON.stringify({ type: 'error', msg: err.message }));
            conn.end();
            return;
          }

          // 선박 → 브라우저
          stream.on('data', (data) => {
            ws.send(JSON.stringify({
              type: 'data',
              data: data.toString('base64')
            }));
          });

          stream.stderr.on('data', (data) => {
            ws.send(JSON.stringify({
              type: 'data',
              data: data.toString('base64')
            }));
          });

          // 브라우저 → 선박
          ws.on('message', (msg) => {
            try {
              const parsed = JSON.parse(msg);
              if (parsed.type === 'input') {
                stream.write(Buffer.from(parsed.data, 'base64'));
              } else if (parsed.type === 'resize') {
                stream.setWindow(parsed.rows, parsed.cols, 0, 0);
              }
            } catch (e) {
              console.error('메시지 파싱 오류:', e);
            }
          });

          stream.on('close', () => {
            ws.send(JSON.stringify({ type: 'status', msg: '세션 종료' }));
            ws.close();
            conn.end();
          });
        }
      );
    });

    conn.on('error', (err) => {
      ws.send(JSON.stringify({ type: 'error', msg: `SSH 오류: ${err.message}` }));
      ws.close();
    });

    conn.connect({
      host: vpnIp,
      port: parseInt(process.env.VESSEL_SSH_PORT),
      username: process.env.VESSEL_SSH_USER,
      password: process.env.VESSEL_SSH_PASSWORD,
      hostVerifier: () => true,
      readyTimeout: 10000,
    });

    ws.on('close', () => {
      conn.end();
    });
  });

  server.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});