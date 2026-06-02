"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import "@xterm/xterm/css/xterm.css";

interface SshTerminalProps {
  vpnIp: string;
  onClose: () => void;
}

function toBase64(str: string): string {
  return btoa(Array.from(new TextEncoder().encode(str), (b) => String.fromCharCode(b)).join(""));
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export default function SshTerminal({ vpnIp, onClose }: SshTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;
    let ws: WebSocket;

    (async () => {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      if (disposed || !containerRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
        theme: {
          background: "#0d1117",
          foreground: "#e2e8f0",
          cursor: "#38bdf8",
          cursorAccent: "#0d1117",
          selectionBackground: "#38bdf830",
          black: "#1e293b",
          red: "#f87171",
          green: "#4ade80",
          yellow: "#fbbf24",
          blue: "#60a5fa",
          magenta: "#a78bfa",
          cyan: "#38bdf8",
          white: "#e2e8f0",
          brightBlack: "#334155",
          brightRed: "#fca5a5",
          brightGreen: "#86efac",
          brightYellow: "#fde68a",
          brightBlue: "#93c5fd",
          brightMagenta: "#c4b5fd",
          brightCyan: "#7dd3fc",
          brightWhite: "#f8fafc",
        },
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      setTimeout(() => fitAddon.fit(), 50);

      term.writeln("\x1b[38;5;38m Connecting to vessel...\x1b[0m\r\n");

      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${protocol}://${window.location.host}/ws/terminal?vpnIp=${vpnIp}`);

      ws.onopen = () => {
        if (!disposed) term.writeln("\x1b[32m WebSocket connected\x1b[0m\r\n");
      };

      ws.onmessage = (event) => {
        if (disposed) return;
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.type === "data") {
            term.write(fromBase64(msg.data));
          } else if (msg.type === "status") {
            term.writeln(`\r\n\x1b[32m ${msg.msg}\x1b[0m\r\n`);
          } else if (msg.type === "error") {
            term.writeln(`\r\n\x1b[31m ${msg.msg}\x1b[0m\r\n`);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        if (!disposed) term.writeln("\r\n\x1b[33m Connection closed\x1b[0m");
      };

      ws.onerror = () => {
        if (!disposed) term.writeln("\r\n\x1b[31m WebSocket error\x1b[0m");
      };

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "input", data: toBase64(data) }));
        }
      });

      const ro = new ResizeObserver(() => {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "resize", rows: term.rows, cols: term.cols }));
        }
      });

      const parent = containerRef.current.parentElement;
      if (parent) ro.observe(parent);

      return () => {
        disposed = true;
        ro.disconnect();
        ws?.close();
        term.dispose();
      };
    })().then((cleanupFn) => {
      if (disposed) cleanupFn?.();
      else (containerRef as any)._cleanup = cleanupFn;
    });

    return () => {
      disposed = true;
      (containerRef as any)._cleanup?.();
      ws?.close();
    };
  }, [vpnIp]);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-[#0d1117]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-400 shadow-[0_0_8px_#4ade80]" />
          <span className="font-mono text-xs text-slate-400">
            ssh <span className="text-slate-500">·</span> {vpnIp}
          </span>
        </div>
        <button
          onClick={onClose}
          title="Back to Map"
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-300"
        >
          <X size={12} />
          Map
        </button>
      </div>

      {/* Terminal canvas */}
      <div ref={containerRef} className="min-h-0 flex-1 p-1" />
    </div>
  );
}
