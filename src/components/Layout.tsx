import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Panel, Group, Separator, type PanelImperativeHandle } from "react-resizable-panels";
import { useStore } from "@/store";
import { useChatStream } from "@/hooks/useChatStream";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import LeftSidebar from "./LeftSidebar";
import AiChatPanel from "./AiChatPanel";
import BottomPanel from "./BottomPanel";
import RightSidebar from "./RightSidebar";
import StatusBar from "./StatusBar";
import Settings from "@/pages/Settings";
import Projects from "@/pages/Projects";
import Sessions from "@/pages/Sessions";

const sepClass =
  "bg-transparent hover:bg-slate-600 active:bg-blue-500 transition-colors z-50 shrink-0";

export default function Layout() {
  const location = useLocation();
  const leftOpen = useStore((s) => s.leftPanelOpen);
  const leftExpanded = useStore((s) => s.leftExpanded);
  const rightOpen = useStore((s) => s.rightPanelOpen);
  const rightExpanded = useStore((s) => s.rightExpanded);
  const bottomExpanded = useStore((s) => s.bottomExpanded);

  // Enable global chat stream listener
  useChatStream();

  // Pixel-based constraints for sidebars — all sizes in px
  const leftMin = leftOpen ? (leftExpanded ? 200 : 48) : 0;
  const leftMax = leftOpen ? (leftExpanded ? 500 : 48) : 0;
  const rightMin = rightOpen ? (rightExpanded ? 200 : 48) : 0;
  const rightMax = rightOpen ? (rightExpanded ? 400 : 48) : 0;

  // Determine which center content to show based on route
  const renderCenter = () => {
    switch (location.pathname) {
      case "/settings":
        return <Settings />;
      case "/projects":
        return <Projects />;
      case "/sessions":
        return <Sessions />;
      case "/":
      default:
        // Default IDE layout — AI Chat takes full center width
        return <AiChatPanel />;
    }
  };

  const showSidebars = location.pathname === "/" || !["/settings", "/projects", "/sessions"].includes(location.pathname);

  // ── Bottom panel imperative control ──
  const bottomPanelRef = useRef<PanelImperativeHandle>(null);

  // Sync bottomExpanded store → imperative collapse/expand
  useEffect(() => {
    const panel = bottomPanelRef.current;
    if (!panel) return;
    if (bottomExpanded && panel.isCollapsed()) {
      panel.expand();
    } else if (!bottomExpanded && !panel.isCollapsed()) {
      panel.collapse();
    }
  }, [bottomExpanded]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden">
      <TopBar />

      {/* ── Main area (vertical: top content + bottom panel) ── */}
      <Group orientation="vertical" className="flex-1">
        {/* Top: horizontal row — Nav | Left | Center | Right */}
        <Panel defaultSize={bottomExpanded ? 85 : 100} minSize={bottomExpanded ? 50 : 40}>
          <Group orientation="horizontal" className="h-full">
            {/* ── Nav Sidebar (always visible) ── */}
            <Panel defaultSize={56} minSize={56} maxSize={56} className="overflow-hidden">
              <Sidebar />
            </Panel>

            <Separator className={sepClass} style={{ width: 1 }} />

            {/* ── Left Sidebar (tasks/callchain/artifacts) ── */}
            <Panel
              defaultSize={leftOpen ? (leftExpanded ? 320 : 48) : 0}
              minSize={showSidebars ? leftMin : 0}
              maxSize={showSidebars ? leftMax : 0}
              className="overflow-hidden"
            >
              {showSidebars && leftOpen && <LeftSidebar />}
            </Panel>

            <Separator
              className={sepClass}
              style={{ width: showSidebars && leftOpen ? 4 : 0 }}
            />

            {/* ── Center Content ── */}
            <Panel minSize={400}>
              {renderCenter()}
            </Panel>

            <Separator
              className={sepClass}
              style={{ width: showSidebars && rightOpen ? 4 : 0 }}
            />

            {/* ── Right Sidebar (explorer/outline/timeline only) ── */}
            <Panel
              defaultSize={rightOpen ? (rightExpanded ? 280 : 48) : 0}
              minSize={showSidebars ? rightMin : 0}
              maxSize={showSidebars ? rightMax : 0}
              className="overflow-hidden"
            >
              {showSidebars && rightOpen && <RightSidebar />}
            </Panel>
          </Group>
        </Panel>

        {/* Bottom resize handle — always grabbable */}
        <Separator
          className="bg-slate-700 hover:bg-blue-500 active:bg-blue-500 transition-colors z-50 shrink-0 cursor-row-resize"
          style={{ height: 6 }}
        />

        {/* Bottom: Changes panel — drag 5%–50%, collapsible below 5% */}
        <Panel
          panelRef={bottomPanelRef}
          defaultSize={bottomExpanded ? 15 : 0}
          minSize={5}
          maxSize={50}
          collapsible
          collapsedSize={0}
          className="overflow-hidden"
        >
          <BottomPanel />
        </Panel>
      </Group>

      <StatusBar />
    </div>
  );
}
