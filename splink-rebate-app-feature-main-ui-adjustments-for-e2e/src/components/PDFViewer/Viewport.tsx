"use client";

import {
  GlobalPointerProvider,
  PagePointerProvider
} from "@embedpdf/plugin-interaction-manager/react";
import { RenderLayer } from "@embedpdf/plugin-render/react";
import { Scroller } from "@embedpdf/plugin-scroll/react";
import { Viewport as EmbedViewport } from "@embedpdf/plugin-viewport/react";
import { MarqueeZoom } from "@embedpdf/plugin-zoom/react";

export const Viewport = () => {
  return (
    <div
      className="flex-1 bg-gray-100 relative"
      style={{ overflow: "hidden", height: "100%" }}
    >
      <GlobalPointerProvider>
        <EmbedViewport
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "#f1f3f5",
            position: "relative"
          }}
        >
          <Scroller
            style={{
              width: "100%",
              height: "100%"
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
                    padding: "10px 0"
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
