import { useStore } from "@/store";
import Editor, { DiffEditor } from "@monaco-editor/react";
import { FileText, GitCompare } from "lucide-react";

const langMap: Record<string, string> = {
  java: "java", js: "javascript", ts: "typescript", tsx: "typescript",
  json: "json", yml: "yaml", yaml: "yaml", xml: "xml",
  sql: "sql", py: "python", rs: "rust", md: "markdown",
  html: "html", css: "css", sh: "shell", ps1: "powershell",
};

function guessLang(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return langMap[ext] || "plaintext";
}

export default function CenterEditor() {
  const mode = useStore((s) => s.editorMode);
  const openFiles = useStore((s) => s.openFiles);
  const activeFile = useStore((s) => s.activeFile);
  const updateContent = useStore((s) => s.updateFileContent);
  const diffContent = useStore((s) => s.diffContent);
  const fontSize = useStore((s) => s.editorFontSize);
  const minimap = useStore((s) => s.editorMinimap);
  const wordWrap = useStore((s) => s.editorWordWrap);

  const active = openFiles.find((f) => f.path === activeFile);

  // ── Diff view ──
  if (mode === "diff" && diffContent) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 shrink-0">
          <GitCompare className="w-3.5 h-3.5 text-blue-400" />Diff 视图
        </div>
        <div className="flex-1">
          <DiffEditor
            height="100%"
            language="java"
            original={diffContent.original}
            modified={diffContent.modified}
            theme="vs-dark"
            options={{ readOnly: true, minimap: { enabled: minimap }, fontSize, lineNumbers: "on", renderSideBySide: true }}
          />
        </div>
      </div>
    );
  }

  // ── File editor ──
  if (active) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1">
          <Editor
            height="100%"
            language={guessLang(active.name)}
            value={active.content}
            onChange={(v) => updateContent(active.path, v || "")}
            theme="vs-dark"
            options={{
              fontSize,
              minimap: { enabled: minimap, scale: 1, showSlider: "mouseover" },
              lineNumbers: "on",
              renderWhitespace: "selection",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap,
            }}
          />
        </div>
      </div>
    );
  }

  // ── No file open ──
  return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-950 text-slate-600">
      <FileText className="w-12 h-12 mb-3 opacity-40" />
      <p className="text-sm">未打开文件</p>
      <p className="text-xs mt-1">从资源管理器选择一个文件开始编辑</p>
    </div>
  );
}
