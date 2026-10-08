"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OfficeViewerKind } from "@/lib/workspace-types";

export function OfficeViewer({
  sessionId,
  path,
  kind,
  onDownload,
}: {
  readonly sessionId: string;
  readonly path: string;
  readonly kind: OfficeViewerKind;
  readonly onDownload: () => void;
}) {
  const previewUrl = `/api/workspace/${encodeURIComponent(sessionId)}/preview?path=${encodeURIComponent(path)}`;

  if (kind === "pdf") {
    return (
      <iframe
        className="h-full w-full border-0 bg-muted/30"
        src={previewUrl}
        title={path}
      />
    );
  }

  if (kind === "image") {
    return (
      <div className="flex h-full min-h-0 items-center justify-center overflow-auto bg-[oklch(0.94_0_0)] p-4 dark:bg-[oklch(0.2_0_0)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={path} className="max-h-full max-w-full object-contain shadow-sm" src={previewUrl} />
      </div>
    );
  }

  if (kind === "unsupported-office") {
    return (
      <Fallback
        message="This legacy Office format can’t be previewed in-browser. Download and open it in Word/Excel/PowerPoint."
        onDownload={onDownload}
        path={path}
      />
    );
  }

  if (kind === "docx") {
    return <DocxViewer onDownload={onDownload} path={path} previewUrl={previewUrl} />;
  }

  if (kind === "xlsx") {
    return <XlsxViewer onDownload={onDownload} path={path} previewUrl={previewUrl} />;
  }

  if (kind === "pptx") {
    return <PptxViewer onDownload={onDownload} path={path} previewUrl={previewUrl} />;
  }

  return <Fallback message="Unsupported file type." onDownload={onDownload} path={path} />;
}

function Fallback({
  path,
  message,
  onDownload,
}: {
  readonly path: string;
  readonly message: string;
  readonly onDownload: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground text-sm">
      <p>{message}</p>
      <Button onClick={onDownload} type="button" variant="outline">
        Download {path.split("/").pop()}
      </Button>
    </div>
  );
}

function DocxViewer({
  previewUrl,
  path,
  onDownload,
}: {
  readonly previewUrl: string;
  readonly path: string;
  readonly onDownload: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;

    host.innerHTML = "";
    setLoading(true);
    setError(undefined);

    void (async () => {
      try {
        const { renderAsync } = await import("docx-preview");
        const response = await fetch(previewUrl);
        if (!response.ok) throw new Error("Failed to load document");
        const buffer = await response.arrayBuffer();
        if (cancelled) return;
        await renderAsync(buffer, host, undefined, {
          className: "eve-docx",
          inWrapper: true,
          ignoreWidth: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render Word document");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [previewUrl]);

  if (error) {
    return <Fallback message={error} onDownload={onDownload} path={path} />;
  }

  return (
    <div className="relative h-full min-h-0 overflow-auto bg-[oklch(0.94_0_0)] dark:bg-[oklch(0.2_0_0)]">
      {loading ? <LoadingLabel label="Rendering Word document…" /> : null}
      <div
        className={cn(
          "eve-docx-host mx-auto max-w-4xl px-4 py-6 [&_section.eve-docx]:mx-auto [&_section.eve-docx]:mb-6 [&_section.eve-docx]:bg-white [&_section.eve-docx]:p-6 [&_section.eve-docx]:text-neutral-900 [&_section.eve-docx]:shadow-sm",
          loading && "invisible",
        )}
        ref={hostRef}
      />
    </div>
  );
}

function XlsxViewer({
  previewUrl,
  path,
  onDownload,
}: {
  readonly previewUrl: string;
  readonly path: string;
  readonly onDownload: () => void;
}) {
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [rows, setRows] = useState<string[][]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);

    void (async () => {
      try {
        const XLSX = await import("xlsx");
        const response = await fetch(previewUrl);
        if (!response.ok) throw new Error("Failed to load spreadsheet");
        const buffer = await response.arrayBuffer();
        if (cancelled) return;
        const workbook = XLSX.read(buffer, { type: "array" });
        const names = workbook.SheetNames;
        setSheetNames(names);
        setActiveSheet(0);
        const sheet = workbook.Sheets[names[0] ?? ""];
        const data = sheet
          ? (XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][])
          : [];
        setRows(normalizeRows(data));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render spreadsheet");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [previewUrl]);

  const selectSheet = async (index: number) => {
    setActiveSheet(index);
    setLoading(true);
    try {
      const XLSX = await import("xlsx");
      const response = await fetch(previewUrl);
      if (!response.ok) throw new Error("Failed to load spreadsheet");
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const name = workbook.SheetNames[index];
      const sheet = name ? workbook.Sheets[name] : undefined;
      const data = sheet
        ? (XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][])
        : [];
      setRows(normalizeRows(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch sheet");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <Fallback message={error} onDownload={onDownload} path={path} />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {sheetNames.length > 1 ? (
        <div className="flex shrink-0 gap-1 overflow-x-auto border-border border-b bg-muted/30 px-2 py-1">
          {sheetNames.map((name, index) => (
            <button
              className={cn(
                "rounded px-2 py-1 text-[11px]",
                index === activeSheet
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-background/70",
              )}
              key={name}
              onClick={() => void selectSheet(index)}
              type="button"
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1 overflow-auto">
        {loading ? <LoadingLabel label="Rendering spreadsheet…" /> : null}
        <table className="min-w-full border-collapse font-mono text-[11px]">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr className="border-border border-b" key={`r-${rowIndex}`}>
                <td className="sticky left-0 bg-muted/80 px-2 py-1 text-right text-muted-foreground">
                  {rowIndex + 1}
                </td>
                {row.map((cell, cellIndex) => (
                  <td
                    className="max-w-64 truncate border-border border-r px-2 py-1 whitespace-pre"
                    key={`c-${rowIndex}-${cellIndex}`}
                    title={cell}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? (
          <p className="p-4 text-muted-foreground text-sm">Sheet is empty.</p>
        ) : null}
      </div>
    </div>
  );
}

function PptxViewer({
  previewUrl,
  path,
  onDownload,
}: {
  readonly previewUrl: string;
  readonly path: string;
  readonly onDownload: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;

    host.innerHTML = "";
    setLoading(true);
    setError(undefined);

    void (async () => {
      try {
        const { init } = await import("pptx-preview");
        const response = await fetch(previewUrl);
        if (!response.ok) throw new Error("Failed to load presentation");
        const buffer = await response.arrayBuffer();
        if (cancelled) return;
        const width = Math.max(640, host.clientWidth - 32);
        const previewer = init(host, {
          width,
          height: Math.round((width * 9) / 16),
        });
        await previewer.preview(buffer);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render PowerPoint");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [previewUrl]);

  if (error) {
    return <Fallback message={error} onDownload={onDownload} path={path} />;
  }

  return (
    <div className="relative h-full min-h-0 overflow-auto bg-[oklch(0.94_0_0)] p-4 dark:bg-[oklch(0.2_0_0)]">
      {loading ? <LoadingLabel label="Rendering PowerPoint…" /> : null}
      <div className={cn("flex justify-center", loading && "invisible")} ref={hostRef} />
    </div>
  );
}

function LoadingLabel({ label }: { readonly label: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 text-muted-foreground text-sm">
      {label}
    </div>
  );
}

function normalizeRows(data: unknown[][]): string[][] {
  const limited = data.slice(0, 500);
  const width = Math.min(
    40,
    limited.reduce((max, row) => Math.max(max, row.length), 0),
  );
  return limited.map((row) => {
    const cells: string[] = [];
    for (let i = 0; i < width; i += 1) {
      const value = row[i];
      cells.push(value == null ? "" : String(value));
    }
    return cells;
  });
}
