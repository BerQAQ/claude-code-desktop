import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { MessageSquare, Clock, Bot, ChevronRight, ArrowLeft, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

interface SessionInfo {
  id: string;
  name: string;
  created: string;
  message_count: number;
}

interface HistoryEntry {
  timestamp: string | null;
  role: string | null;
  content: string | null;
  extra: Record<string, unknown>;
}

interface SessionDetail {
  id: string;
  name: string;
  created: string;
  model: string;
  message_count: number;
  history_preview: HistoryEntry[];
}

export default function Sessions() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [_loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => { loadSessions(); }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await invoke<SessionInfo[]>("list_sessions");
      setSessions(data);
    } catch (err) {
      console.error(err);
      toast("加载会话失败: " + err, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const data = await invoke<SessionDetail>("get_session_detail", { sessionId: id });
      setDetail(data);
    } catch (err) {
      toast("加载详情失败: " + err, "error");
    } finally {
      setLoadingDetail(false);
    }
  };

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleString("zh-CN"); } catch { return s; }
  };

  // ---- 会话详情视图 ----
  if (detail) {
    return (
      <div className="p-8 h-full flex flex-col">
        <div className="flex items-center gap-4 mb-6 shrink-0">
          <Button onClick={() => setDetail(null)} variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="w-4 h-4" />返回列表
          </Button>
          <h2 className="text-xl font-bold text-slate-100">{detail.name}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
          {/* 左侧元信息 */}
          <Card className="bg-slate-900 border-slate-800 h-fit">
            <CardHeader>
              <CardTitle className="text-sm text-slate-200">会话信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">创建时间</span>
                <span className="text-slate-200 ml-auto">{fmtDate(detail.created)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Bot className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">模型</span>
                <Badge variant="outline" className="ml-auto">{detail.model}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">消息数</span>
                <span className="text-slate-200 ml-auto">{detail.message_count}</span>
              </div>
            </CardContent>
          </Card>

          {/* 右侧历史预览 */}
          <Card className="bg-slate-900 border-slate-800 lg:col-span-2 flex flex-col overflow-hidden">
            <CardHeader className="shrink-0">
              <CardTitle className="text-sm text-slate-200">历史记录预览（最近 20 条）</CardTitle>
              <CardDescription>只读摘要</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3">
              {detail.history_preview.length === 0 ? (
                <p className="text-sm text-slate-500">暂无历史记录</p>
              ) : (
                detail.history_preview.map((entry, i) => (
                  <div key={i} className="p-3 rounded-md bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={entry.role === "user" ? "secondary" : "default"} className="text-xs">
                        {entry.role || "unknown"}
                      </Badge>
                      {entry.timestamp && (
                        <span className="text-xs text-slate-600">{fmtDate(entry.timestamp)}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                      {entry.content || "(空)"}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---- 会话列表视图 ----
  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">会话记录</h2>
          <p className="text-sm text-slate-400 mt-1">浏览和管理历史会话</p>
        </div>
        <Button onClick={loadSessions} variant="outline" size="sm" className="gap-1.5">
          <RefreshCw className="w-4 h-4" />刷新
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <MessageSquare className="w-12 h-12 mb-4" />
            <p className="text-sm">暂无会话记录</p>
            <p className="text-xs mt-1">启动 Claude Code 后会自动记录会话</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sessions.map((s) => (
              <Card key={s.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors cursor-pointer group" onClick={() => handleViewDetail(s.id)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-md bg-slate-800 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm text-slate-100 truncate">{s.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{fmtDate(s.created)}
                        </CardDescription>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <Badge variant="secondary" className="text-xs">
                    {s.message_count} 条消息
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
