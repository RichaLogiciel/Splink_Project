"use client";

import { useFullscreen } from "@embedpdf/plugin-fullscreen/react";
import { useScroll } from "@embedpdf/plugin-scroll/react";
import { SpreadMode, useSpread } from "@embedpdf/plugin-spread/react";
import { useZoom } from "@embedpdf/plugin-zoom/react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  PanelLeft,
  ScanSearch,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { useState } from "react";

interface ToolbarProps {
  onSearchClick: () => void;
  onClose: () => void;
  isSearchOpen: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const Toolbar = ({
  onSearchClick,
  onClose,
  isSearchOpen,
  isSidebarOpen,
  onToggleSidebar
}: ToolbarProps) => {
  const [pageInput, setPageInput] = useState("");
  const { state: zoomState, provides: zoom } = useZoom();
  const { spreadMode, provides: spread } = useSpread();
  const { state: fullscreenState, provides: fullscreenProvider } =
    useFullscreen();
  const { state: scrollState, provides: scrollProvider } = useScroll();

  if (!zoom || !spread) {
    return null;
  }

  const currentZoomLevel = zoomState?.currentZoomLevel || 1.0;
  const isFullscreen = fullscreenState?.isFullscreen || false;
  const isMarqueeZoomActive = zoom.isMarqueeZoomActive?.() || false;

  const handleZoomReset = () => {
    zoom.requestZoom(1.0);
  };

  const handleToggleMarqueeZoom = () => {
    zoom.toggleMarqueeZoom();
  };

  const handleToggleFullscreen = () => {
    fullscreenProvider?.toggleFullscreen();
  };

  // Page navigation handlers
  const currentPage = scrollState?.currentPage || 1;
  const totalPages = scrollState?.totalPages || 0;

  const handlePreviousPage = () => {
    scrollProvider?.scrollToPreviousPage();
  };

  const handleNextPage = () => {
    scrollProvider?.scrollToNextPage();
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const pageNum = parseInt(pageInput, 10);
      if (pageNum >= 1 && pageNum <= totalPages) {
        scrollProvider?.scrollToPage({ pageNumber: pageNum });
        setPageInput("");
      }
    }
  };

  const handlePageInputBlur = () => {
    const pageNum = parseInt(pageInput, 10);
    if (pageNum >= 1 && pageNum <= totalPages) {
      scrollProvider?.scrollToPage({ pageNumber: pageNum });
    }
    setPageInput("");
  };

  return (
    <div className="flex flex-wrap items-center px-4 py-2 bg-gray-50 border-b border-gray-200">
      {/* Left side - Zoom controls */}
      <div className="flex items-center gap-2 flex-1">
        {/* Sidebar Toggle Button */}
        <button
          onClick={onToggleSidebar}
          className={`p-2 rounded transition-colors ${
            isSidebarOpen ? "bg-blue-100 text-blue-600" : "hover:bg-gray-200"
          }`}
          aria-label={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
          title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Zoom Out */}
        <button
          onClick={() => zoom.zoomOut()}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          aria-label="Zoom Out"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Current Zoom Level Display */}
        <div className="hidden sm:block px-2.5 py-1 text-xs font-medium border border-gray-300 rounded min-w-[60px] text-center bg-gray-100">
          {Math.round(currentZoomLevel * 100)}%
        </div>

        {/* Zoom In */}
        <button
          onClick={() => zoom.zoomIn()}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          aria-label="Zoom In"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Reset Zoom */}
        <button
          onClick={handleZoomReset}
          className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          aria-label="Reset Zoom"
          title="Reset Zoom to 100%"
        >
          Reset
        </button>

        {/* Area Zoom (Marquee Zoom) */}
        <button
          onClick={handleToggleMarqueeZoom}
          className={`hidden xl:block p-2 rounded transition-colors ${
            isMarqueeZoomActive
              ? "bg-blue-100 text-blue-600"
              : "hover:bg-gray-200"
          }`}
          aria-label="Area Zoom"
          title="Area Zoom (Marquee Zoom)"
        >
          <ScanSearch className="w-4 h-4" />
        </button>
      </div>

      {/* Center - Page Navigation */}
      {totalPages > 0 && (
        <div className="hidden sm:flex items-center lg:justify-center gap-2 lg:px-4 flex-shrink-0">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage <= 1}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous Page"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 text-sm">
            <span className="text-gray-700">Page</span>
            <input
              type="text"
              value={pageInput || currentPage}
              onChange={handlePageInputChange}
              onKeyDown={handlePageInputKeyDown}
              onBlur={handlePageInputBlur}
              onFocus={(e) => {
                setPageInput(e.target.value);
                e.target.select();
              }}
              className="w-12 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Current page"
            />
            <span className="text-gray-700">of {totalPages}</span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next Page"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Right side - Search and Fullscreen */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        {/* Page Layout Controls */}
        <div className="hidden xl:flex items-center border border-gray-300 rounded">
          <button
            onClick={() => spread.setSpreadMode(SpreadMode.None)}
            className={`px-3 py-1 text-xs font-medium transition-colors rounded-l ${
              spreadMode === SpreadMode.None
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
            aria-label="Single Page"
            title="Single Page View"
          >
            Single Page
          </button>
          <button
            onClick={() => spread.setSpreadMode(SpreadMode.Odd)}
            className={`px-3 py-1 text-xs font-medium transition-colors border-l border-gray-300 ${
              spreadMode === SpreadMode.Odd
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
            aria-label="Two-Page (Odd)"
            title="Two-Page View (Odd)"
          >
            Two-Page (Odd)
          </button>
          <button
            onClick={() => spread.setSpreadMode(SpreadMode.Even)}
            className={`px-3 py-1 text-xs font-medium transition-colors border-l border-gray-300 rounded-r ${
              spreadMode === SpreadMode.Even
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
            aria-label="Two-Page (Even)"
            title="Two-Page View (Even)"
          >
            Two-Page (Even)
          </button>
        </div>

        {/* Divider */}
        <div className="hidden xl:block w-px h-6 bg-gray-300 mx-1" />

        {/* Fullscreen */}
        <button
          onClick={handleToggleFullscreen}
          className="hidden md:block p-2 hover:bg-gray-200 rounded transition-colors"
          aria-label="Fullscreen"
          title="Fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Close */}
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          aria-label="Close"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
