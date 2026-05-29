import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  toast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

let _addToast: ((message: string, type?: "success" | "error" | "info") => void) | null = null;

export function toast(message: string, type: "success" | "error" | "info" = "success") {
  _addToast?.(message, type);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let counter = 0;
  const addToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);
  _addToast = addToast;
  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm border animate-in slide-in-from-right",
              t.type === "success" && "bg-emerald-900/80 border-emerald-700 text-emerald-200",
              t.type === "error" && "bg-red-900/80 border-red-700 text-red-200",
              t.type === "info" && "bg-blue-900/80 border-blue-700 text-blue-200"
            )}
          >
            {t.type === "success" && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
            {t.type === "error" && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {t.type === "info" && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="p-0.5 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
