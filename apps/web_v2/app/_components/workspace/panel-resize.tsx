"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "eve:workspace-panel-widths";

type PanelWidths = {
  left: number;
  right: number;
};

const DEFAULTS: PanelWidths = { left: 220, right: 380 };
const MIN_LEFT = 160;
const MAX_LEFT = 480;
const MIN_RIGHT = 280;
const MAX_RIGHT = 640;
const MIN_CENTER = 280;

function readStoredWidths(): PanelWidths {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PanelWidths>;
    return {
      left: clamp(Number(parsed.left) || DEFAULTS.left, MIN_LEFT, MAX_LEFT),
      right: clamp(Number(parsed.right) || DEFAULTS.right, MIN_RIGHT, MAX_RIGHT),
    };
  } catch {
    return DEFAULTS;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function useResizablePanels() {
  const [widths, setWidths] = useState<PanelWidths>(DEFAULTS);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWidths(readStoredWidths());
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  }, [widths]);

  const startResize = useCallback((side: "left" | "right", clientX: number) => {
    const container = containerRef.current;
    if (!container) return;

    const startX = clientX;
    const startWidths = { ...widths };
    const containerWidth = container.getBoundingClientRect().width;

    const onMove = (event: PointerEvent) => {
      const delta = event.clientX - startX;
      if (side === "left") {
        const maxLeft = Math.min(MAX_LEFT, containerWidth - startWidths.right - MIN_CENTER);
        setWidths((prev) => ({
          ...prev,
          left: clamp(startWidths.left + delta, MIN_LEFT, maxLeft),
        }));
        return;
      }
      const maxRight = Math.min(MAX_RIGHT, containerWidth - startWidths.left - MIN_CENTER);
      setWidths((prev) => ({
        ...prev,
        right: clamp(startWidths.right - delta, MIN_RIGHT, maxRight),
      }));
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [widths]);

  return { widths, containerRef, startResize };
}

export function PanelResizeHandle({
  onResizeStart,
  className,
}: {
  readonly onResizeStart: (clientX: number) => void;
  readonly className?: string;
}) {
  return (
    <div
      aria-orientation="vertical"
      aria-label="Resize panel"
      className={cn(
        "group relative z-10 w-0 shrink-0 cursor-col-resize",
        className,
      )}
      onPointerDown={(event) => {
        event.preventDefault();
        onResizeStart(event.clientX);
      }}
      role="separator"
    >
      <div className="absolute inset-y-0 -left-1 w-2" />
      <div className="absolute inset-y-0 left-0 w-px bg-border transition-colors group-hover:bg-foreground/40 group-active:bg-foreground/60" />
    </div>
  );
}
