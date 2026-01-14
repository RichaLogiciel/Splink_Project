"use client";

import {
  GlobalPointerProvider,
  PagePointerProvider
} from "@embedpdf/plugin-interaction-manager/react";
import { usePan } from "@embedpdf/plugin-pan/react";
import { RenderLayer } from "@embedpdf/plugin-render/react";
import { Scroller } from "@embedpdf/plugin-scroll/react";
import { Viewport as EmbedViewport } from "@embedpdf/plugin-viewport/react";
import { MarqueeZoom } from "@embedpdf/plugin-zoom/react";
import { useEffect, useRef, useState } from "react";

export const Viewport = () => {
  const { isPanning, provides: pan } = usePan();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false); // Ref to track current dragging state for event handlers

  // Strict drag-to-pan functionality - single isDragging boolean contract
  useEffect(() => {
    if (!isPanning || !pan) {
      isDraggingRef.current = false;
      setIsDragging(false);
      return;
    }

    const viewportElement = viewportRef.current;

    // Centralized function to stop dragging - called on ALL release paths
    const stopDragging = (e?: MouseEvent) => {
      // CRITICAL: Set isDragging to false immediately on ALL release paths
      if (!isDraggingRef.current) return; // Already stopped, no-op

      isDraggingRef.current = false;
      setIsDragging(false);

      // Release pan plugin state by dispatching mouseup event
      if (viewportElement) {
        const embedViewport = viewportElement.querySelector(
          '[style*="backgroundColor: rgb(241, 243, 245)"]'
        ) as HTMLElement;
        const targetElement = embedViewport || viewportElement;

        if (targetElement) {
          const mouseUpEvent = new MouseEvent("mouseup", {
            bubbles: true,
            cancelable: true,
            view: window,
            button: e?.button || 0,
            buttons: 0, // CRITICAL: No buttons pressed
            clientX: e?.clientX || 0,
            clientY: e?.clientY || 0,
            screenX: e?.screenX || 0,
            screenY: e?.screenY || 0
          });

          targetElement.dispatchEvent(mouseUpEvent);
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      // STRICT RULE: Set isDragging = true ONLY on mousedown within viewport
      if (viewportElement?.contains(e.target as Node)) {
        // DO NOT preventDefault or stopPropagation - let pan plugin receive the event
        // We only track state here, pan plugin handles the actual dragging
        isDraggingRef.current = true;
        setIsDragging(true); // Cursor changes to "grabbing" immediately
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      // STRICT RULE: Allow panning ONLY if isDragging === true
      if (!isDraggingRef.current) {
        // Not dragging - do nothing, don't interfere
        return;
      }

      // Safety check: if buttons are released but we think we're dragging, stop
      if (e.buttons === 0) {
        stopDragging(e);
        return;
      }

      // DO NOT preventDefault - let pan plugin receive the event
      // We only track state here, pan plugin handles the actual panning
      // Native drag is prevented via draggable=false and dragstart handlers
    };

    const handleMouseUp = (e: MouseEvent) => {
      // STRICT RULE: ALWAYS stop dragging on mouseup
      stopDragging(e);
    };

    const handleMouseLeave = () => {
      // STRICT RULE: ALWAYS stop dragging if mouse leaves viewport
      stopDragging();
    };

    const handleWindowBlur = () => {
      // STRICT RULE: ALWAYS stop dragging if window loses focus
      stopDragging();
    };

    const handleVisibilityChange = () => {
      // STRICT RULE: ALWAYS stop dragging if document becomes hidden
      if (document.hidden) {
        stopDragging();
      }
    };

    // Attach all event listeners
    // Use capture phase for mousemove/mouseup to track state, but don't interfere with pan plugin
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("mouseup", handleMouseUp, true);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (viewportElement) {
      // Use capture phase to track state, but let event continue to pan plugin
      viewportElement.addEventListener("mousedown", handleMouseDown, true);
      viewportElement.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      // Cleanup all event listeners
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("mouseup", handleMouseUp, true);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (viewportElement) {
        viewportElement.removeEventListener("mousedown", handleMouseDown, true);
        viewportElement.removeEventListener("mouseleave", handleMouseLeave);
      }
      // Reset state on cleanup
      isDraggingRef.current = false;
      setIsDragging(false);
    };
  }, [isPanning, pan]);

  // Disable native drag-and-drop on all elements within viewport
  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) return;

    const disableDragOnElement = (element: HTMLElement) => {
      element.setAttribute("draggable", "false");
      element.style.userSelect = "none";
      (element.style as any).webkitUserSelect = "none";
      (element.style as any).MozUserSelect = "none";
      (element.style as any).msUserSelect = "none";

      const preventDragStart = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };

      element.addEventListener("dragstart", preventDragStart, true);

      // Store handler for cleanup
      (element as any).__preventDragStart = preventDragStart;
    };

    const disableDragOnAllChildren = (root: HTMLElement) => {
      disableDragOnElement(root);
      const allElements = root.querySelectorAll("*");
      allElements.forEach((el) => {
        if (el instanceof HTMLElement) {
          disableDragOnElement(el);
        }
      });
    };

    // Disable drag on existing elements
    disableDragOnAllChildren(viewportElement);

    // Use MutationObserver to disable drag on dynamically added children
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            disableDragOnAllChildren(node);
          }
        });
      });
    });

    observer.observe(viewportElement, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
      // Cleanup event listeners
      const allElements = viewportElement.querySelectorAll("*");
      allElements.forEach((el) => {
        if (el instanceof HTMLElement && (el as any).__preventDragStart) {
          el.removeEventListener(
            "dragstart",
            (el as any).__preventDragStart,
            true
          );
          delete (el as any).__preventDragStart;
        }
      });
    };
  }, []);

  return (
    <div
      ref={viewportRef}
      className="flex-1 bg-gray-100 relative"
      draggable={false}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
      style={{
        overflow: "hidden",
        height: "100%",
        cursor: isPanning ? (isDragging ? "grabbing" : "grab") : "default",
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none"
      }}
    >
      <GlobalPointerProvider>
        <EmbedViewport
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "#f1f3f5",
            position: "relative",
            cursor: isPanning ? (isDragging ? "grabbing" : "grab") : "default"
          }}
        >
          <Scroller
            style={{
              width: "100%",
              height: "100%",
              cursor: isPanning ? (isDragging ? "grabbing" : "grab") : "default"
            }}
            renderPage={({ width, height, pageIndex, scale, rotation }) => (
              <PagePointerProvider
                pageIndex={pageIndex}
                pageWidth={width}
                pageHeight={height}
                rotation={rotation || 0}
                scale={scale}
              >
                <div
                  key={pageIndex}
                  style={{
                    width,
                    height,
                    margin: "0 auto",
                    position: "relative",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    padding: "10px 0",
                    cursor: isPanning
                      ? isDragging
                        ? "grabbing"
                        : "grab"
                      : "default"
                  }}
                >
                  {/* Base render layer - renders the page */}
                  <RenderLayer pageIndex={pageIndex} scale={scale} />
                  {/* Marquee layer for area zoom */}
                  <MarqueeZoom pageIndex={pageIndex} scale={scale} />
                </div>
              </PagePointerProvider>
            )}
          />
        </EmbedViewport>
      </GlobalPointerProvider>
    </div>
  );
};
