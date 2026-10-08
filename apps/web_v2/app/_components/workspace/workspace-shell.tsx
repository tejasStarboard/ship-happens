"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileEditorPanel, type EditorTab } from "@/app/_components/workspace/file-editor";
import { FileTreePanel } from "@/app/_components/workspace/file-tree";
import {
  ChatPanel,
  type ChatTabState,
} from "@/app/_components/workspace/chat-panel";
import {
  PanelResizeHandle,
  useResizablePanels,
} from "@/app/_components/workspace/panel-resize";
import { UserMenu } from "@/app/_components/user-menu";
import type { WorkspaceEntry } from "@/lib/workspace-types";
import { getOfficeViewerKind, isTextPath } from "@/lib/workspace-types";

type WorkspacePayload = {
  readonly id: string;
  readonly title: string;
  readonly chats: Array<{
    readonly id: string;
    readonly sessionId: string | null;
    readonly title: string;
  }>;
};

export function WorkspaceShell({
  workspaceId: initialWorkspaceId,
}: {
  readonly workspaceId?: string;
}) {
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(initialWorkspaceId);
  const [chats, setChats] = useState<ChatTabState[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [tree, setTree] = useState<WorkspaceEntry[]>([]);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [treeError, setTreeError] = useState<string>();
  const [bootError, setBootError] = useState<string>();
  const [chatInsertText, setChatInsertText] = useState<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  const fileList = useMemo(() => flattenFiles(tree), [tree]);
  const openTabs = useMemo(() => tabs.map((tab) => tab.path), [tabs]);

  const applyWorkspace = useCallback((workspace: WorkspacePayload, preferChatId?: string) => {
    setWorkspaceId(workspace.id);
    const nextChats = workspace.chats.map((chat) => ({
      id: chat.id,
      sessionId: chat.sessionId,
      title: chat.title,
    }));
    setChats(nextChats);
    setActiveChatId((current) => {
      if (preferChatId && nextChats.some((chat) => chat.id === preferChatId)) {
        return preferChatId;
      }
      if (current && nextChats.some((chat) => chat.id === current)) {
        return current;
      }
      return nextChats[0]?.id ?? "";
    });
  }, []);

  const refreshTree = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/workspace/${encodeURIComponent(id)}/tree`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const body = (await response.json()) as { tree: WorkspaceEntry[] };
      setTree(body.tree);
      setTreeError(undefined);
    } catch (error) {
      setTreeError(error instanceof Error ? error.message : "Failed to load files");
    }
  }, []);

  useEffect(() => {
    if (!initialWorkspaceId) {
      setBootError("Missing workspace id");
      return;
    }

    let cancelled = false;

    const boot = async () => {
      try {
        const response = await fetch(
          `/api/workspaces/${encodeURIComponent(initialWorkspaceId)}`,
        );
        if (!response.ok) throw new Error("Workspace not found");
        const workspace = (await response.json()) as WorkspacePayload;
        if (!cancelled) applyWorkspace(workspace);
      } catch (error) {
        if (!cancelled) {
          setBootError(error instanceof Error ? error.message : "Failed to open workspace");
        }
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [applyWorkspace, initialWorkspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    void refreshTree(workspaceId);
  }, [workspaceId, refreshTree]);

  const scheduleRefresh = useCallback(() => {
    if (!workspaceId) return;
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      void refreshTree(workspaceId);
    }, 400);
  }, [workspaceId, refreshTree]);

  const openFile = useCallback(
    async (path: string) => {
      if (!workspaceId) return;
      if (tabsRef.current.some((tab) => tab.path === path)) {
        setActivePath(path);
        return;
      }
      const response = await fetch(
        `/api/workspace/${encodeURIComponent(workspaceId)}/file?path=${encodeURIComponent(path)}`,
      );
      if (!response.ok) {
        setTreeError("Failed to open file");
        return;
      }
      const body = (await response.json()) as {
        path: string;
        content: string | null;
        encoding: "utf-8" | "binary";
        editable: boolean;
      };
      const viewerKind = getOfficeViewerKind(body.path);
      setTabs((prev) => {
        if (prev.some((tab) => tab.path === body.path)) return prev;
        return [
          ...prev,
          {
            path: body.path,
            content: body.content ?? "",
            dirty: false,
            editable: !viewerKind && body.editable && body.encoding === "utf-8",
            encoding: body.encoding,
            viewerKind,
          },
        ];
      });
      setActivePath(body.path);
    },
    [workspaceId],
  );

  const closeTab = useCallback(
    (path: string) => {
      setTabs((prev) => {
        const next = prev.filter((tab) => tab.path !== path);
        if (activePath === path) {
          setActivePath(next.at(-1)?.path ?? null);
        }
        return next;
      });
    },
    [activePath],
  );

  const changeTab = useCallback((path: string, content: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.path === path ? { ...tab, content, dirty: true } : tab)),
    );
  }, []);

  const saveTab = useCallback(
    async (path: string) => {
      if (!workspaceId) return;
      const tab = tabs.find((entry) => entry.path === path);
      if (!tab || !tab.editable) return;
      const response = await fetch(`/api/workspace/${encodeURIComponent(workspaceId)}/file`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path, content: tab.content }),
      });
      if (!response.ok) {
        setTreeError("Failed to save file");
        return;
      }
      setTabs((prev) => prev.map((entry) => (entry.path === path ? { ...entry, dirty: false } : entry)));
      scheduleRefresh();
    },
    [workspaceId, scheduleRefresh, tabs],
  );

  const downloadFile = useCallback(
    (path: string) => {
      if (!workspaceId) return;
      const url = `/api/workspace/${encodeURIComponent(workspaceId)}/download?path=${encodeURIComponent(path)}`;
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = path.split("/").pop() ?? "download";
      anchor.click();
    },
    [workspaceId],
  );

  const downloadAll = useCallback(() => {
    if (!workspaceId) return;
    const url = `/api/workspace/${encodeURIComponent(workspaceId)}/zip`;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${workspaceId}.zip`;
    anchor.click();
  }, [workspaceId]);

  const renameFile = useCallback(
    async (fromPath: string, toPath: string) => {
      if (!workspaceId) return;
      const response = await fetch(`/api/workspace/${encodeURIComponent(workspaceId)}/file`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from: fromPath, to: toPath }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setTreeError(body?.error ?? "Failed to rename");
        return;
      }
      setTabs((prev) =>
        prev.map((tab) =>
          tab.path === fromPath
            ? { ...tab, path: toPath, viewerKind: getOfficeViewerKind(toPath) }
            : tab,
        ),
      );
      setActivePath((current) => (current === fromPath ? toPath : current));
      await refreshTree(workspaceId);
    },
    [refreshTree, workspaceId],
  );

  const deleteFile = useCallback(
    async (path: string) => {
      if (!workspaceId) return;
      if (!window.confirm(`Delete ${path}?`)) return;
      const response = await fetch(
        `/api/workspace/${encodeURIComponent(workspaceId)}/file?path=${encodeURIComponent(path)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        setTreeError("Failed to delete");
        return;
      }
      setTabs((prev) => {
        const next = prev.filter((tab) => tab.path !== path);
        setActivePath((current) =>
          current === path ? (next.at(-1)?.path ?? null) : current,
        );
        return next;
      });
      await refreshTree(workspaceId);
    },
    [refreshTree, workspaceId],
  );

  const referenceInChat = useCallback((path: string) => {
    setChatInsertText(`\`/workspace/${path}\``);
  }, []);

  const uploadFiles = useCallback(
    async (files: FileList, directory: string) => {
      if (!workspaceId) return;
      const form = new FormData();
      form.set("directory", directory);
      for (const file of files) {
        form.append("files", file);
      }
      const response = await fetch(`/api/workspace/${encodeURIComponent(workspaceId)}/upload`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        setTreeError("Upload failed");
        return;
      }
      const body = (await response.json()) as { files: string[] };
      await refreshTree(workspaceId);
      const first = body.files.find((file) => isTextPath(file));
      if (first) {
        await openFile(first);
      }
    },
    [workspaceId, openFile, refreshTree],
  );

  const addChat = useCallback(async () => {
    if (!workspaceId) return;
    const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/chats`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      setTreeError("Failed to create chat");
      return;
    }
    const chat = (await response.json()) as ChatTabState;
    setChats((prev) => [...prev, chat]);
    setActiveChatId(chat.id);
  }, [workspaceId]);

  const closeChat = useCallback(
    async (chatId: string) => {
      if (!workspaceId || chats.length <= 1) return;
      const response = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/chats/${encodeURIComponent(chatId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        setTreeError("Failed to close chat");
        return;
      }
      setChats((prev) => {
        const next = prev.filter((chat) => chat.id !== chatId);
        if (activeChatId === chatId) {
          setActiveChatId(next.at(-1)?.id ?? "");
        }
        return next;
      });
    },
    [activeChatId, chats.length, workspaceId],
  );

  const bindSession = useCallback(
    async (chatId: string, sessionId: string) => {
      if (!workspaceId) return;
      setChats((prev) =>
        prev.map((chat) => (chat.id === chatId ? { ...chat, sessionId } : chat)),
      );
      await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/chats/${encodeURIComponent(chatId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId }),
        },
      );
      // Session bind may have merged files that landed under the session folder.
      void refreshTree(workspaceId);
    },
    [refreshTree, workspaceId],
  );

  const renameChat = useCallback(
    async (chatId: string, title: string) => {
      if (!workspaceId) return;
      setChats((prev) =>
        prev.map((chat) => (chat.id === chatId ? { ...chat, title } : chat)),
      );
      await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/chats/${encodeURIComponent(chatId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title }),
        },
      );
    },
    [workspaceId],
  );

  const workspaceContext = useMemo(
    () => ({
      workspaceId,
      workspaceFiles: fileList,
      openTabs,
      activeTab: activePath,
    }),
    [activePath, fileList, openTabs, workspaceId],
  );

  const { widths, containerRef, startResize } = useResizablePanels();

  if (bootError) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-destructive text-sm">
        {bootError}
      </div>
    );
  }

  if (!workspaceId || !activeChatId) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground text-sm">
        Opening workspace…
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-10 shrink-0 items-center gap-3 border-border border-b px-3">
        <Link className="font-medium text-sm tracking-tight hover:underline" href="/">
          eve workspaces
        </Link>
        <span className="text-muted-foreground text-sm">/</span>
        <span className="truncate font-mono text-[11px] text-muted-foreground">{workspaceId}</span>
        {treeError ? <span className="truncate text-[11px] text-destructive">{treeError}</span> : null}
        <div className="ml-auto">
          <UserMenu variant="inline" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1" ref={containerRef}>
        <aside className="min-h-0 shrink-0 overflow-hidden" style={{ width: widths.left }}>
          <FileTreePanel
            activePath={activePath}
            disabled={!workspaceId}
            onDelete={deleteFile}
            onDownload={downloadFile}
            onDownloadAll={downloadAll}
            onOpen={(path) => void openFile(path)}
            onReferenceInChat={referenceInChat}
            onRefresh={() => {
              void refreshTree(workspaceId);
            }}
            onRename={renameFile}
            onUpload={uploadFiles}
            tree={tree}
          />
        </aside>

        <PanelResizeHandle onResizeStart={(clientX) => startResize("left", clientX)} />

        <section className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <FileEditorPanel
            activePath={activePath}
            onChange={changeTab}
            onClose={closeTab}
            onDownload={downloadFile}
            onSave={saveTab}
            onSelect={setActivePath}
            sessionId={workspaceId}
            tabs={tabs}
          />
        </section>

        <PanelResizeHandle onResizeStart={(clientX) => startResize("right", clientX)} />

        <aside className="min-h-0 shrink-0 overflow-hidden" style={{ width: widths.right }}>
          <ChatPanel
            activeChatId={activeChatId}
            chats={chats}
            insertText={chatInsertText}
            onAddChat={addChat}
            onBindSession={bindSession}
            onCloseChat={closeChat}
            onIdle={scheduleRefresh}
            onInsertTextConsumed={() => setChatInsertText(null)}
            onRenameChat={renameChat}
            onSelectChat={setActiveChatId}
            workspaceContext={workspaceContext}
            workspaceId={workspaceId}
          />
        </aside>
      </div>
    </div>
  );
}

function flattenFiles(entries: WorkspaceEntry[]): string[] {
  const files: string[] = [];
  const walk = (nodes: WorkspaceEntry[]) => {
    for (const node of nodes) {
      if (node.type === "file") files.push(node.path);
      else walk(node.children);
    }
  };
  walk(entries);
  return files;
}
