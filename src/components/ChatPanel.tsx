import { useState, useRef, useEffect } from "react";
import { Send, Square, Bot, User, ChevronDown } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const MODELS = ["deepseek-v4-pro", "deepseek-v4-flash", "claude-sonnet-4-20250514"];

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState(MODELS[0]);
  const [modelOpen, setModelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    // Mock AI response
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", content: "这是 AI 模拟回复。\n\n\`\`\`java\n// Example code\npublic void hello() {\n    System.out.println(\"Hello\");\n}\n\`\`\`" }]);
      setLoading(false);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-8">输入消息开始 AI 对话</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-blue-600" : "bg-purple-600"}`}>
              {m.role === "user" ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-white" />}
            </div>
            <div className={`max-w-[75%] rounded-lg px-3 py-2 text-xs leading-relaxed ${m.role === "user" ? "bg-blue-600/20 text-blue-100" : "bg-slate-800 text-slate-300"}`}>
              <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 pl-8">
            <Bot className="w-4 h-4 animate-pulse" />思考中...
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 p-3 shrink-0">
        <div className="flex gap-2">
          {/* Model selector */}
          <div className="relative">
            <button onClick={() => setModelOpen(!modelOpen)} className="flex items-center gap-1 px-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded text-slate-300 hover:border-slate-600">
              {model} <ChevronDown className="w-3 h-3" />
            </button>
            {modelOpen && (
              <div className="absolute bottom-full mb-1 left-0 bg-slate-800 border border-slate-700 rounded shadow-lg z-50">
                {MODELS.map((m) => (
                  <button key={m} onClick={() => { setModel(m); setModelOpen(false); }} className="block w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 whitespace-nowrap">{m}</button>
                ))}
              </div>
            )}
          </div>
          {/* Input */}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="flex-1 px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
          />
          {loading ? (
            <button className="p-1.5 text-red-400 hover:text-red-300 shrink-0" title="停止生成"><Square className="w-4 h-4" /></button>
          ) : (
            <button onClick={handleSend} className="p-1.5 text-blue-400 hover:text-blue-300 shrink-0" title="发送"><Send className="w-4 h-4" /></button>
          )}
        </div>
      </div>
    </div>
  );
}
