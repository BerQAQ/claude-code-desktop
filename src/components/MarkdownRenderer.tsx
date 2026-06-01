import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function CodeBlock({ className, children }: { className?: string; children: React.ReactNode }) {
  const match = /language-(\w+)/.exec(className || "");
  const lang = match ? match[1] : "";
  const code = String(children).replace(/\n$/, "");
  return (
    <div className="my-2 rounded-md bg-slate-950 border border-slate-700 overflow-hidden">
      {lang && (
        <div className="px-3 py-1 text-xs text-slate-500 bg-slate-900 border-b border-slate-800">
          {lang}
        </div>
      )}
      <pre className="px-3 py-2 text-xs text-slate-300 overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children }: any) {
          const isBlock = className?.startsWith("language-");
          if (isBlock) {
            return <CodeBlock className={className}>{children}</CodeBlock>;
          }
          return (
            <code className="px-1 py-0.5 rounded bg-slate-800 text-blue-300 text-[11px]">
              {children}
            </code>
          );
        },
        pre({ children }) {
          return <>{children}</>;
        },
        p({ children }) {
          return <p className="mb-1 last:mb-0">{children}</p>;
        },
        ul({ children }) {
          return <ul className="list-disc list-inside mb-1 space-y-0.5">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside mb-1 space-y-0.5">{children}</ol>;
        },
        li({ children }) {
          return <li className="text-slate-300">{children}</li>;
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-xs border-collapse border border-slate-700">
                {children}
              </table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="border border-slate-700 px-2 py-1 bg-slate-800 text-slate-300 font-medium">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="border border-slate-700 px-2 py-1 text-slate-400">{children}</td>
          );
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              className="text-blue-400 underline hover:text-blue-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          );
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-2 border-slate-600 pl-3 my-1 text-slate-400 italic">
              {children}
            </blockquote>
          );
        },
        h1({ children }) {
          return <h1 className="text-base font-bold text-slate-200 mt-3 mb-1">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-sm font-bold text-slate-200 mt-2 mb-1">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-xs font-bold text-slate-200 mt-2 mb-1">{children}</h3>;
        },
        hr() {
          return <hr className="my-3 border-slate-700" />;
        },
        strong({ children }) {
          return <strong className="font-semibold text-slate-100">{children}</strong>;
        },
        em({ children }) {
          return <em className="italic text-slate-300">{children}</em>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
