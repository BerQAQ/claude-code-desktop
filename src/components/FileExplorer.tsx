import { useState } from "react";
import { useStore } from "@/store";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText } from "lucide-react";

interface TreeNode {
  name: string; type: "file" | "folder"; children?: TreeNode[];
}

const mockTree: TreeNode[] = [
  { name: "src", type: "folder", children: [
    { name: "main", type: "folder", children: [
      { name: "java", type: "folder", children: [
        { name: "com", type: "folder", children: [
          { name: "example", type: "folder", children: [
            { name: "order", type: "folder", children: [
              { name: "OrderController.java", type: "file" },
              { name: "OrderService.java", type: "file" },
              { name: "OrderMapper.java", type: "file" },
              { name: "OrderDTO.java", type: "file" },
            ]},
          ]},
        ]},
      ]},
      { name: "resources", type: "folder", children: [
        { name: "application.yml", type: "file" },
        { name: "banner.txt", type: "file" },
      ]},
    ]},
    { name: "test", type: "folder", children: [
      { name: "java", type: "folder", children: [
        { name: "com", type: "folder", children: [
          { name: "example", type: "folder", children: [
            { name: "OrderTest.java", type: "file" },
          ]},
        ]},
      ]},
    ]},
  ]},
  { name: "pom.xml", type: "file" },
];

function TreeItem({ node, depth = 0, projectPath }: { node: TreeNode; depth: number; projectPath: string }) {
  const [open, setOpen] = useState(depth < 2);
  const openFile = useStore((s) => s.openFile);
  const isFolder = node.type === "folder";

  const handleClick = () => {
    if (isFolder) { setOpen(!open); return; }
    const lang = node.name.split(".").pop() || "";
    openFile({
      path: projectPath + "\\" + node.name,
      name: node.name,
      content: `// ${node.name}\n// Open this file from the project\n`,
      language: lang,
      isDirty: false,
    });
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className="flex items-center gap-1 px-2 py-1 text-xs cursor-pointer hover:bg-slate-800/50 transition-colors"
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {isFolder ? (
          open ? <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        {isFolder ? (
          open ? <FolderOpen className="w-3.5 h-3.5 text-yellow-500 shrink-0" /> : <Folder className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        )}
        <span className="truncate text-slate-300">{node.name}</span>
      </div>
      {open && isFolder && node.children?.map((c, i) => (
        <TreeItem key={i} node={c} depth={depth + 1} projectPath={projectPath} />
      ))}
    </div>
  );
}

export default function FileExplorer() {
  const project = useStore((s) => s.activeProject);
  return (
    <div className="py-2">
      <p className="text-xs font-medium text-slate-400 px-3 mb-2">
        {project?.name || "未打开项目"}
      </p>
      {mockTree.map((n, i) => (
        <TreeItem key={i} node={n} depth={0} projectPath={project?.path || "D:\\"} />
      ))}
    </div>
  );
}
