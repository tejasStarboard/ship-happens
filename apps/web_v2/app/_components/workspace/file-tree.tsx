"use client";

import {
  AtSignIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { WorkspaceEntry } from "@/lib/workspace-types";

export function FileTreePanel({
  tree,
  activePath,
  disabled,
  onOpen,
  onRefresh,
  onUpload,
  onDownload,
  onDownloadAll,
  onRename,
  onDelete,
  onReferenceInChat,
}: {
  readonly tree: WorkspaceEntry[];
  readonly activePath: string | null;
  readonly disabled?: boolean;
  readonly onOpen: (path: string) => void;
  readonly onRefresh: () => void;
  readonly onUpload: (files: FileList, directory: string) => void | Promise<void>;
  readonly onDownload: (path: string) => void;
  readonly onDownloadAll: () => void;
  readonly onRename: (fromPath: string, toPath: string) => void | Promise<void>;
  readonly onDelete: (path: string) => void | Promise<void>;
  readonly onReferenceInChat: (path: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadDir, setUploadDir] = useState("");
  const [renamingPath, setRenamingPath] = useState<string | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[oklch(0.97_0_0)] dark:bg-[oklch(0.17_0_0)]">
      <div className="flex h-9 shrink-0 items-center gap-1 border-border border-b px-2">
        <span className="flex-1 truncate px-1 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
          Explorer
        </span>
        <Button
          aria-label="Upload files"
          className="size-7"
          disabled={disabled}
          onClick={() => {
            setUploadDir("");
            inputRef.current?.click();
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          <UploadIcon className="size-3.5" />
        </Button>
        <Button
          aria-label="Download all as zip"
          className="size-7"
          disabled={disabled || tree.length === 0}
          onClick={onDownloadAll}
          size="icon"
          type="button"
          variant="ghost"
        >
          <DownloadIcon className="size-3.5" />
        </Button>
        <Button
          aria-label="Refresh files"
          className="size-7"
          disabled={disabled}
          onClick={onRefresh}
          size="icon"
          type="button"
          variant="ghost"
        >
          <RefreshCwIcon className="size-3.5" />
        </Button>
        <input
          className="hidden"
          multiple
          onChange={(event) => {
            const files = event.target.files;
            if (files && files.length > 0) {
              void onUpload(files, uploadDir);
            }
            event.target.value = "";
          }}
          ref={inputRef}
          type="file"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-1 py-1 font-mono text-xs">
        {disabled ? (
          <p className="px-2 py-3 text-muted-foreground text-xs">Starting session…</p>
        ) : tree.length === 0 ? (
          <div className="space-y-2 px-2 py-3 text-muted-foreground text-xs">
            <p>No files yet.</p>
            <p>Upload here or attach in chat. Synced to the agent on the next message.</p>
          </div>
        ) : (
          <TreeNodes
            activePath={activePath}
            depth={0}
            entries={tree}
            onDelete={onDelete}
            onDownload={onDownload}
            onOpen={onOpen}
            onReferenceInChat={onReferenceInChat}
            onRename={onRename}
            onStartRename={setRenamingPath}
            onUploadInto={(directory) => {
              setUploadDir(directory);
              inputRef.current?.click();
            }}
            renamingPath={renamingPath}
            setRenamingPath={setRenamingPath}
          />
        )}
      </div>
    </div>
  );
}

type TreeCallbacks = {
  readonly onOpen: (path: string) => void;
  readonly onDownload: (path: string) => void;
  readonly onUploadInto: (directory: string) => void;
  readonly onRename: (fromPath: string, toPath: string) => void | Promise<void>;
  readonly onDelete: (path: string) => void | Promise<void>;
  readonly onReferenceInChat: (path: string) => void;
  readonly onStartRename: (path: string) => void;
  readonly renamingPath: string | null;
  readonly setRenamingPath: (path: string | null) => void;
};

function TreeNodes({
  entries,
  depth,
  activePath,
  ...callbacks
}: {
  readonly entries: WorkspaceEntry[];
  readonly depth: number;
  readonly activePath: string | null;
} & TreeCallbacks) {
  return (
    <ul className="space-y-px">
      {entries.map((entry) =>
        entry.type === "dir" ? (
          <DirNode
            activePath={activePath}
            depth={depth}
            entry={entry}
            key={entry.path}
            {...callbacks}
          />
        ) : (
          <FileNode
            active={activePath === entry.path}
            depth={depth}
            entry={entry}
            key={entry.path}
            renaming={callbacks.renamingPath === entry.path}
            {...callbacks}
          />
        ),
      )}
    </ul>
  );
}

function DirNode({
  entry,
  depth,
  activePath,
  ...callbacks
}: {
  readonly entry: Extract<WorkspaceEntry, { type: "dir" }>;
  readonly depth: number;
  readonly activePath: string | null;
} & TreeCallbacks) {
  const containsActive = useMemo(
    () => (activePath ? activePath === entry.path || activePath.startsWith(`${entry.path}/`) : false),
    [activePath, entry.path],
  );
  const [open, setOpen] = useState(containsActive || depth < 1);

  return (
    <li>
      <div
        className="group flex items-center gap-0.5 rounded-sm pr-1 hover:bg-accent/70"
        style={{ paddingLeft: 4 + depth * 10 }}
      >
        <button
          className="flex min-w-0 flex-1 items-center gap-1 py-0.5 text-left"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {open ? (
            <ChevronDownIcon className="size-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRightIcon className="size-3 shrink-0 text-muted-foreground" />
          )}
          {open ? (
            <FolderOpenIcon className="size-3.5 shrink-0 text-amber-700/80 dark:text-amber-400/80" />
          ) : (
            <FolderIcon className="size-3.5 shrink-0 text-amber-700/80 dark:text-amber-400/80" />
          )}
          <span className="truncate">{entry.name}</span>
        </button>
        <button
          aria-label={`Upload into ${entry.name}`}
          className="invisible rounded p-0.5 text-muted-foreground hover:bg-background group-hover:visible"
          onClick={() => callbacks.onUploadInto(entry.path)}
          type="button"
        >
          <UploadIcon className="size-3" />
        </button>
      </div>
      {open ? (
        <TreeNodes activePath={activePath} depth={depth + 1} entries={entry.children} {...callbacks} />
      ) : null}
    </li>
  );
}

function FileNode({
  entry,
  depth,
  active,
  renaming,
  onOpen,
  onDownload,
  onRename,
  onDelete,
  onReferenceInChat,
  onStartRename,
  setRenamingPath,
}: {
  readonly entry: Extract<WorkspaceEntry, { type: "file" }>;
  readonly depth: number;
  readonly active: boolean;
  readonly renaming: boolean;
} & TreeCallbacks) {
  const [draftName, setDraftName] = useState(entry.name);

  const commitRename = async () => {
    const nextName = draftName.trim();
    setRenamingPath(null);
    if (!nextName || nextName === entry.name || nextName.includes("/") || nextName.includes("\\")) {
      setDraftName(entry.name);
      return;
    }
    const parent = entry.path.includes("/")
      ? entry.path.slice(0, entry.path.lastIndexOf("/"))
      : "";
    const toPath = parent ? `${parent}/${nextName}` : nextName;
    await onRename(entry.path, toPath);
  };

  const actions = [
    {
      label: "Open",
      icon: <FileIcon className="size-3.5" />,
      run: () => onOpen(entry.path),
    },
    {
      label: "Rename",
      icon: <PencilIcon className="size-3.5" />,
      run: () => {
        setDraftName(entry.name);
        onStartRename(entry.path);
      },
    },
    {
      label: "Download",
      icon: <DownloadIcon className="size-3.5" />,
      run: () => onDownload(entry.path),
    },
    {
      label: "Reference in chat",
      icon: <AtSignIcon className="size-3.5" />,
      run: () => onReferenceInChat(entry.path),
    },
  ] as const;

  return (
    <li>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "group flex items-center gap-0.5 rounded-sm pr-1",
              active ? "bg-accent text-accent-foreground" : "hover:bg-accent/70",
            )}
            style={{ paddingLeft: 4 + depth * 10 }}
          >
            {renaming ? (
              <div className="flex min-w-0 flex-1 items-center gap-1 py-0.5">
                <span className="size-3 shrink-0" />
                <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <input
                  autoFocus
                  className="min-w-0 flex-1 rounded border border-border bg-background px-1 py-0.5 text-xs outline-none"
                  onBlur={() => void commitRename()}
                  onChange={(event) => setDraftName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void commitRename();
                    }
                    if (event.key === "Escape") {
                      setDraftName(entry.name);
                      setRenamingPath(null);
                    }
                  }}
                  value={draftName}
                />
              </div>
            ) : (
              <button
                className="flex min-w-0 flex-1 items-center gap-1 py-0.5 text-left"
                onClick={() => onOpen(entry.path)}
                type="button"
              >
                <span className="size-3 shrink-0" />
                <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{entry.name}</span>
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label={`Actions for ${entry.name}`}
                  className="invisible rounded p-0.5 text-muted-foreground hover:bg-background group-hover:visible data-[state=open]:visible"
                  type="button"
                >
                  <MoreHorizontalIcon className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                {actions.map((action) => (
                  <DropdownMenuItem
                    className="text-xs"
                    key={action.label}
                    onSelect={action.run}
                  >
                    {action.icon}
                    {action.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs"
                  onSelect={() => void onDelete(entry.path)}
                  variant="destructive"
                >
                  <Trash2Icon className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="min-w-44">
          {actions.map((action) => (
            <ContextMenuItem className="text-xs" key={action.label} onSelect={action.run}>
              {action.icon}
              {action.label}
            </ContextMenuItem>
          ))}
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-xs"
            onSelect={() => void onDelete(entry.path)}
            variant="destructive"
          >
            <Trash2Icon className="size-3.5" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </li>
  );
}
