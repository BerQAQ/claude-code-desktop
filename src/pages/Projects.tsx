import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Search, Plus, Play, FolderGit2, GitBranch, Bot, Clock, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

interface ProjectInfo {
  name: string;
  path: string;
  has_git: boolean;
  has_claude: boolean;
  last_modified: string;
}

export default function Projects() {
  const [workspace, setWorkspace] = useState("D:\\");
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [launching, setLaunching] = useState<string | null>(null);
  const [launchMsg, setLaunchMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleScan = async () => {
    setScanning(true);
    setLaunchMsg(null);
    try {
      const data = await invoke<ProjectInfo[]>("scan_projects", { workspace });
      setProjects(data);
      toast("扫描完成，找到 " + data.length + " 个项目", data.length > 0 ? "success" : "info");
    } catch (err) {
      toast("扫描失败: " + err, "error");
    } finally {
      setScanning(false);
    }
  };

  const handleBrowse = async () => {
    try {
      const s = await open({ directory: true, multiple: false, title: "选择工作区" });
      if (s && typeof s === "string") setWorkspace(s);
    } catch (e) { console.error(e); }
  };

  const handleAdd = async () => {
    try {
      const s = await open({ directory: true, multiple: false, title: "添加项目文件夹" });
      if (s && typeof s === "string") {
        const name = s.split("\\").pop() || s;
        setProjects((prev) => [{ name, path: s, has_git: false, has_claude: false, last_modified: new Date().toLocaleString("zh-CN") }, ...prev]);
        toast("已添加: " + name, "success");
      }
    } catch (e) { console.error(e); }
  };

  const handleLaunch = async (p: string) => {
    setLaunching(p);
    setLaunchMsg(null);
    try {
      const msg = await invoke<string>("launch_claude", { path: p });
      setLaunchMsg({ ok: true, text: msg });
      toast("已启动 Claude Code", "success");
    } catch (err) {
      setLaunchMsg({ ok: false, text: String(err) });
      toast("启动失败: " + err, "error");
    } finally {
      setLaunching(null);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">项目管理</h2>
          <p className="text-sm text-slate-400 mt-1">扫描工作区，发现并管理 Claude Code 项目</p>
        </div>
        <Button onClick={handleAdd} variant="outline" size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />添加项目
        </Button>
      </div>

      <Card className="mb-6 shrink-0 bg-slate-900/50 border-slate-800">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="flex-1 flex gap-2">
              <input type="text" value={workspace} onChange={(e) => setWorkspace(e.target.value)} placeholder="工作区路径，如 D:\" className="flex-1 px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-md text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500" />
              <Button onClick={handleBrowse} variant="outline" size="sm" className="shrink-0">浏览</Button>
            </div>
            <Button onClick={handleScan} disabled={scanning} size="sm" className="gap-1.5 shrink-0">
              {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {scanning ? "扫描中..." : "扫描"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {launchMsg && (
        <div className={"mb-6 px-4 py-3 rounded-md text-sm shrink-0 " + (launchMsg.ok ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border border-red-500/20 text-red-300")}>
          {launchMsg.text}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {projects.length === 0 && !scanning ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <FolderGit2 className="w-12 h-12 mb-4" />
            <p className="text-sm">暂无项目</p>
            <p className="text-xs mt-1">输入工作区路径后点击"扫描"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((proj, i) => (
              <Card key={i} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-md bg-blue-600/20 flex items-center justify-center shrink-0">
                        <FolderGit2 className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-sm text-slate-100">{proj.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5 font-mono max-w-[200px] truncate" title={proj.path}>{proj.path}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {proj.has_git && <Badge variant="secondary" className="gap-1 text-xs"><GitBranch className="w-3 h-3" /> Git</Badge>}
                    {proj.has_claude && <Badge variant="secondary" className="gap-1 text-xs"><Bot className="w-3 h-3" /> Claude</Badge>}
                    {!proj.has_git && !proj.has_claude && <span className="text-xs text-slate-600">手动添加</span>}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />{proj.last_modified}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => handleLaunch(proj.path)} disabled={launching === proj.path} size="sm" className="w-full gap-1.5">
                    {launching === proj.path ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    {launching === proj.path ? "启动中..." : "启动 Claude Code"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
