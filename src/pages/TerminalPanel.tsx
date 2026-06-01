import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { X, Maximize2, Minimize2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import "@xterm/xterm/css/xterm.css";

export default function TerminalPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const projectPath = (location.state as { path?: string })?.path || "D:\\";
  const projectName = projectPath.split("\\").pop() || projectPath;

  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const ptyId = useRef<string | null>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const [status, setStatus] = useState<"connecting" | "ready" | "closed">("connecting");
  const [fullscreen, setFullscreen] = useState(false);

  const cleanup = useCallback(async () => {
    if (ptyId.current) {
      try { await invoke("kill_pty", { ptyId: ptyId.current }); } catch {}
      ptyId.current = null;
    }
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }
    if (term.current) {
      term.current.dispose();
      term.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!terminalRef.current) return;

      // Create terminal
      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Consolas, "Courier New", monospace',
        theme: {
          background: "#0f172a",
          foreground: "#e2e8f0",
          cursor: "#3b82f6",
          selectionBackground: "#1e3a5f",
          black: "#1e293b",
          red: "#ef4444",
          green: "#22c55e",
          yellow: "#eab308",
          blue: "#3b82f6",
          magenta: "#a855f7",
          cyan: "#06b6d4",
          white: "#e2e8f0",
          brightBlack: "#475569",
          brightRed: "#f87171",
          brightGreen: "#4ade80",
          brightYellow: "#facc15",
          brightBlue: "#60a5fa",
          brightMagenta: "#c084fc",
          brightCyan: "#22d3ee",
          brightWhite: "#f8fafc",
        },
        allowProposedApi: true,
        allowTransparency: false,
        cols: 100,
        rows: 30,
      });

      // Addons
      const fit = new FitAddon();
      terminal.loadAddon(fit);
      terminal.loadAddon(new WebLinksAddon());
      term.current = terminal;
      fitAddon.current = fit;

      // Mount
      terminal.open(terminalRef.current);

      // Fit after a short delay
      setTimeout(() => {
        try { fit.fit(); } catch {}
      }, 100);

      // Spawn PTY
      try {
        const { cols, rows } = terminal;
        const id = await invoke<string>("spawn_pty", {
          cwd: projectPath,
          cols: cols || 100,
          rows: rows || 30,
        });
        ptyId.current = id;
      } catch (err) {
        toast("终端启动失败: " + err, "error");
        setStatus("closed");
        return;
      }

      // Listen for PTY output
      const unlisten = await listen<{ id: string; data: string }>(
        "pty-output",
        (event) => {
          if (event.payload.id === ptyId.current) {
            terminal.write(event.payload.data);
          }
        }
      );
      unlistenRef.current = unlisten;

      // Send keyboard input to PTY
      terminal.onData((data) => {
        if (ptyId.current) {
          invoke("write_pty", { ptyId: ptyId.current, data }).catch(() => {});
        }
      });

      // Handle resize
      terminal.onResize(({ cols, rows }) => {
        if (ptyId.current) {
          invoke("resize_pty", {
            ptyId: ptyId.current,
            cols,
            rows,
          }).catch(() => {});
        }
      });

      // Start Claude Code
      if (!cancelled && ptyId.current) {
        await invoke("write_pty", {
          ptyId: ptyId.current,
          data: "claude\r\n",
        }).catch(() => {});
      }

      if (!cancelled) setStatus("ready");
    };

    init();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [projectPath, cleanup]);

  const handleClose = () => {
    cleanup();
    navigate(-1);
  };

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
    setTimeout(() => {
      try { fitAddon.current?.fit(); } catch {}
    }, 100);
  };

  const handleResize = () => {
    try { fitAddon.current?.fit(); } catch {}
  };

  // Auto-fit on window resize
  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className={`flex flex-col bg-slate-950 ${fullscreen ? "fixed inset-0 z-50" : "h-full"}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${
            status === "ready" ? "bg-emerald-500" :
            status === "connecting" ? "bg-yellow-500 animate-pulse" :
            "bg-red-500"
          }`} />
          <span className="text-sm font-medium text-slate-200">{projectName}</span>
          <span className="text-xs text-slate-600 font-mono truncate max-w-[300px]">{projectPath}</span>
        </div>
        <div className="flex items-center gap-1">
          {status === "connecting" && (
            <Loader2 className="w-4 h-4 text-yellow-500 animate-spin mr-2" />
          )}
          <Button onClick={toggleFullscreen} variant="ghost" size="icon" className="h-8 w-8" title={fullscreen ? "退出全屏" : "全屏"}>
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button onClick={handleClose} variant="ghost" size="icon" className="h-8 w-8" title="关闭终端">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Terminal container */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-hidden"
        style={{ padding: "4px 8px" }}
      />
    </div>
  );
}
