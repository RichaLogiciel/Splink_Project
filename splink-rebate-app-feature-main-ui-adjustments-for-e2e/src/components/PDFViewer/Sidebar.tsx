"use client";

import { useScroll } from "@embedpdf/plugin-scroll/react";
import { ThumbImg, ThumbnailsPane } from "@embedpdf/plugin-thumbnail/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarProps {
  isMobile?: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar = ({
  isMobile = false,
  isOpen,
  onToggle
}: SidebarProps) => {
  const { state, provides } = useScroll();
  const isCollapsed = !isOpen;

  return (
    <div
      className={`bg-gray-50 border-r border-gray-200 transition-all duration-300 flex flex-col ${
        isCollapsed ? "w-0 overflow-hidden" : "w-44"
      }`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 px-2">Thumbnails</h3>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Thumbnail List */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden relative">
          <ThumbnailsPane>
            {(m) => {
              const isActive = state?.currentPage === m.pageIndex + 1;
              return (
                <div
                  key={m.pageIndex}
                  style={{
                    position: "absolute",
                    top: m.top,
                    height: m.wrapperHeight,
                    width: "100%",
                    padding: "0 8px",
                    cursor: "pointer"
                  }}
                  onClick={() => {
                    provides?.scrollToPage?.({ pageNumber: m.pageIndex + 1 });
                  }}
                >
                  <div
                    style={{
                      border: `2px solid ${isActive ? "#3b82f6" : "#e5e7eb"}`,
                      borderRadius: "4px",
                      width: m.width,
                      height: m.height,
                      backgroundColor: isActive ? "#eff6ff" : "white",
                      transition: "all 0.2s",
                      overflow: "hidden",
                      position: "relative",
                      left: "50%",
                      transform: "translateX(-50%)"
                    }}
                    className={isActive ? "" : "hover:border-gray-400"}
                  >
                    <ThumbImg meta={m} />
                  </div>
                  <div
                    style={{
                      height: m.labelHeight,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      color: isActive ? "#3b82f6" : "#6b7280",
                      fontWeight: isActive ? "600" : "400",
                      marginTop: "4px"
                    }}
                  >
                    Page {m.pageIndex + 1}
                  </div>
                </div>
              );
            }}
          </ThumbnailsPane>
        </div>
      )}
    </div>
  );
};
