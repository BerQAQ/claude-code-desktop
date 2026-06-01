import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "@/store";
import { toast } from "@/components/ui/toast";

interface ChatChunkPayload {
  taskId: string;
  delta?: string;
  content?: string;
  error?: string;
  type: "delta" | "done" | "error";
}

export function useChatStream() {
  const appendToStreamBuffer = useStore((s) => s.appendToStreamBuffer);
  const finalizeStreamMessage = useStore((s) => s.finalizeStreamMessage);
  const setStreaming = useStore((s) => s.setStreaming);

  useEffect(() => {
    const setup = async () => {
      const unlisten = await listen<ChatChunkPayload>(
        "chat-chunk",
        (event) => {
          const { taskId, delta, error, type } = event.payload;

          if (type === "delta" && delta) {
            appendToStreamBuffer(taskId, delta);
          } else if (type === "done") {
            finalizeStreamMessage(taskId);
            setStreaming(taskId, false);
            // Persist messages to disk
            const state = useStore.getState();
            const task = state.tasks.find((t) => t.id === taskId);
            if (task) {
              invoke("save_session_messages", {
                taskId,
                messagesJson: JSON.stringify(
                  task.messages.map((m) => ({
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp,
                  }))
                ),
              }).catch(() => {});
            }
          } else if (type === "error") {
            setStreaming(taskId, false);
            toast(error || "对话出错");
          }
        }
      );
      return unlisten;
    };

    const promise = setup();
    return () => {
      promise.then((fn) => fn());
    };
  }, [appendToStreamBuffer, finalizeStreamMessage, setStreaming]);
}
