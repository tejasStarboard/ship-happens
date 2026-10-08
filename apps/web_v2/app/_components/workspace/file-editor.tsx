"use client";

import { DownloadIcon, FileIcon, SaveIcon, XIcon } from "lucide-react";
import { OfficeViewer } from "@/app/_components/workspace/office-viewer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getOfficeViewerKind,
  languageFromPath,
  type OfficeViewerKind,
} from "@/lib/workspace-types";

export type EditorTab = {
  readonly path: string;
  readonly content: string;
  readonly dirty: boolean;
  readonly editable: boolean;
  readonly encoding: "utf-8" | "binary";
  readonly viewerKind: OfficeViewerKind | null;
};

export function FileEditorPanel({
  sessionId,
  tabs,
  activePath,
  onSelect,
  onClose,
  onChange,
  onSave,
  onDownload,
}: {
  readonly sessionId?: string;
  readonly tabs: readonly EditorTab[];
  readonly activePath: string | null;
  readonly onSelect: (path: string) => void;
  readonly onClose: (path: string) => void;
  readonly onChange: (path: string, content: string) => void;
  readonly onSave: (path: string) => void | Promise<void>;
  readonly onDownload: (path: string) => void;
}) {
  const active = tabs.find((tab) => tab.path === activePath) ?? null;
  const viewerKind = active?.viewerKind ?? (active ? getOfficeViewerKind(active.path) : null);

  if (tabs.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-background text-muted-foreground">
        <FileIcon className="size-8 opacity-40" />
        <p className="text-sm">Open a file from the explorer</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-9 shrink-0 items-end gap-px overflow-x-auto border-border border-b bg-muted/40 px-1">
        {tabs.map((tab) => {
          const selected = tab.path === activePath;
          return (
            <div
              className={cn(
                "group flex max-w-48 shrink-0 items-center gap-1 border-transparent border-b-2 px-2 py-1.5 text-xs",
                selected
                  ? "border-foreground bg-background text-foreground"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
              key={tab.path}
            >
              <button
                className="min-w-0 truncate text-left"
                onClick={() => onSelect(tab.path)}
                title={tab.path}
                type="button"
              >
                {tab.dirty ? "● " : ""}
                {tab.path.split("/").pop()}
              </button>
              <button
                aria-label={`Close ${tab.path}`}
                className="rounded p-0.5 opacity-60 hover:bg-accent hover:opacity-100"
                onClick={() => onClose(tab.path)}
                type="button"
              >
                <XIcon className="size-3" />
              </button>
            </div>
          );
        })}
      </div>

      {active ? (
        <>
          <div className="flex h-8 shrink-0 items-center gap-2 border-border border-b px-3 text-[11px] text-muted-foreground">
            <span className="min-w-0 flex-1 truncate font-mono">{active.path}</span>
            <span className="uppercase tracking-wide">
              {viewerKind ?? languageFromPath(active.path)}
            </span>
            {active.editable ? (
              <Button
                className="h-6 gap-1 px-2 text-[11px]"
                disabled={!active.dirty}
                onClick={() => void onSave(active.path)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <SaveIcon className="size-3" />
                Save
              </Button>
            ) : null}
            <Button
              className="h-6 gap-1 px-2 text-[11px]"
              onClick={() => onDownload(active.path)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <DownloadIcon className="size-3" />
              Download
            </Button>
          </div>
          {viewerKind && sessionId ? (
            <div className="min-h-0 flex-1">
              <OfficeViewer
                kind={viewerKind}
                onDownload={() => onDownload(active.path)}
                path={active.path}
                sessionId={sessionId}
              />
            </div>
          ) : active.encoding === "binary" || !active.editable ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground text-sm">
              <p>Binary file — open with Download.</p>
              <Button onClick={() => onDownload(active.path)} type="button" variant="outline">
                Download {active.path.split("/").pop()}
              </Button>
            </div>
          ) : (
            <textarea
              className="min-h-0 flex-1 resize-none bg-background px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground outline-none"
              onChange={(event) => onChange(active.path, event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "s") {
                  event.preventDefault();
                  void onSave(active.path);
                }
              }}
              spellCheck={false}
              value={active.content}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
