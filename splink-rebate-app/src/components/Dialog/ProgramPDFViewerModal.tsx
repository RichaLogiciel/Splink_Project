"use client";

import { createPluginRegistration } from "@embedpdf/core";
import { EmbedPDF } from "@embedpdf/core/react";
import { usePdfiumEngine } from "@embedpdf/engines/react";
import { useCallback, useMemo, useState } from "react";

// Import all plugins
import { FullscreenPluginPackage } from "@embedpdf/plugin-fullscreen/react";
import { InteractionManagerPluginPackage } from "@embedpdf/plugin-interaction-manager/react";
import {
  LoaderPluginPackage,
  useLoaderCapability
} from "@embedpdf/plugin-loader/react";
import { PanPluginPackage } from "@embedpdf/plugin-pan/react";
import { RenderPluginPackage } from "@embedpdf/plugin-render/react";
import { RotatePluginPackage } from "@embedpdf/plugin-rotate/react";
import { ScrollPluginPackage } from "@embedpdf/plugin-scroll/react";
import { SearchPluginPackage } from "@embedpdf/plugin-search/react";
import { SpreadMode, SpreadPluginPackage } from "@embedpdf/plugin-spread/react";
import { ThumbnailPluginPackage } from "@embedpdf/plugin-thumbnail/react";
import { TilingPluginPackage } from "@embedpdf/plugin-tiling/react";
import { ViewportPluginPackage } from "@embedpdf/plugin-viewport/react";
import { ZoomMode, ZoomPluginPackage } from "@embedpdf/plugin-zoom/react";

// Import components
import { SearchPanel } from "../PDFViewer/SearchPanel";
import { Sidebar } from "../PDFViewer/Sidebar";
import { Toolbar } from "../PDFViewer/Toolbar";
import { Viewport } from "../PDFViewer/Viewport";

interface PDFViewerModalProps {
  pdfUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ProgramPDFViewerModalProps {
  pdfUrl: string;
  onClose: () => void;
}

export const ProgramPDFViewerModal = ({
  pdfUrl,
  onClose
}: ProgramPDFViewerModalProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Memoize toggle handlers to prevent unnecessary re-renders
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const handleToggleSearch = useCallback(() => {
    setIsSearchOpen((prev) => !prev);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  // Error handler for PDF loading
  const handlePdfError = (err: any) => {
    console.error("PDF Load Error:", err);
    setError(err?.message || "Failed to load PDF");
    setPdfLoading(false);
  };

  // Register all plugins - Loader must be first
  // Memoize plugins to prevent re-initialization when sidebar state changes
  const plugins = useMemo(
    () => [
      createPluginRegistration(LoaderPluginPackage, {
        loadingOptions: {
          type: "url",
          pdfFile: {
            id: "program-pdf",
            url: pdfUrl
          }
        }
      }),
      createPluginRegistration(ViewportPluginPackage),
      createPluginRegistration(ScrollPluginPackage),
      createPluginRegistration(RenderPluginPackage),
      createPluginRegistration(InteractionManagerPluginPackage),
      createPluginRegistration(ZoomPluginPackage, {
        defaultZoomLevel: ZoomMode.Automatic,
        minZoom: 0.2,
        maxZoom: 4.0
      }),
      createPluginRegistration(TilingPluginPackage, {
        tileSize: 512
      }),
      createPluginRegistration(SearchPluginPackage),
      createPluginRegistration(PanPluginPackage, {
        defaultMode: "mobile"
      }),
      createPluginRegistration(RotatePluginPackage),
      createPluginRegistration(SpreadPluginPackage, {
        defaultSpreadMode: SpreadMode.None
      }),
      createPluginRegistration(FullscreenPluginPackage),
      createPluginRegistration(ThumbnailPluginPackage, {
        width: 120,
        gap: 8,
        buffer: 3,
        labelHeight: 16,
        autoScroll: true,
        scrollBehavior: "smooth",
        imagePadding: 0,
        paddingY: 8
      })
    ],
    [pdfUrl] // Only recreate plugins when pdfUrl changes
  );

  // Initialize the engine
  const { engine, isLoading, error: engineError } = usePdfiumEngine();

  if (engineError) {
    return (
      <div className="p-4 text-red-600">
        Error initializing PDF engine: {engineError.message || "Unknown error"}
      </div>
    );
  }

  if (!engine) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <p className="font-semibold mb-2">Error loading PDF</p>
        <p className="text-sm">{error}</p>
        <p className="text-xs text-gray-500 mt-2">URL: {pdfUrl}</p>
        <button
          onClick={() => {
            setError(null);
            setPdfLoading(true);
            window.location.reload();
          }}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <EmbedPDF engine={engine} plugins={plugins}>
      <PDFViewerContent
        onSearchClick={handleToggleSearch}
        onClose={onClose}
        isSearchOpen={isSearchOpen}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        onCloseSearch={handleCloseSearch}
      />
    </EmbedPDF>
  );
};

// Separate component to use hooks inside EmbedPDF context
const PDFViewerContent = ({
  onSearchClick,
  onClose,
  isSearchOpen,
  isSidebarOpen,
  onToggleSidebar,
  onCloseSearch
}: {
  onSearchClick: () => void;
  onClose: () => void;
  isSearchOpen: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onCloseSearch: () => void;
}) => {
  const { isLoading: isDocumentLoading, provides: loaderProvider } =
    useLoaderCapability();

  // Show loading screen until document is loaded
  // Document is ready when isLoading is false and loaderProvider is available
  if (isDocumentLoading || !loaderProvider) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ height: "100%" }}>
      <Toolbar
        onSearchClick={onSearchClick}
        onClose={onClose}
        isSearchOpen={isSearchOpen}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar}
      />
      <SearchPanel isOpen={isSearchOpen} onClose={onCloseSearch} />
      <div className="flex flex-1" style={{ overflow: "hidden", minHeight: 0 }}>
        <Sidebar
          isMobile={false}
          isOpen={isSidebarOpen}
          onToggle={onToggleSidebar}
        />
        <div
          className="flex-1 relative"
          style={{ overflow: "hidden", minHeight: 0 }}
        >
          <Viewport />
        </div>
      </div>
    </div>
  );
};

const PDFViewerModal: React.FC<PDFViewerModalProps> = ({
  pdfUrl,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-[95vw] h-[95vh] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden">
        <ProgramPDFViewerModal pdfUrl={pdfUrl} onClose={onClose} />
      </div>
    </div>
  );
};

export default PDFViewerModal;
