"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { UserMenu } from "@/app/_components/user-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type WorkspaceRow = {
  readonly id: string;
  readonly title: string;
  readonly createdAt: number;
  readonly chatCount: number;
};

export function WorkspaceHome() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/workspaces");
      if (!response.ok) throw new Error("Failed to load workspaces");
      const body = (await response.json()) as { workspaces: WorkspaceRow[] };
      setWorkspaces(body.workspaces);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setCreating(true);
    setError(undefined);
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim() || "Workspace" }),
      });
      if (!response.ok) throw new Error("Failed to create workspace");
      const workspace = (await response.json()) as { id: string };
      router.push(`/w/${encodeURIComponent(workspace.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
      setCreating(false);
    }
  };

  const remove = async (workspaceId: string, workspaceTitle: string) => {
    if (!window.confirm(`Delete workspace “${workspaceTitle}”? This cannot be undone.`)) {
      return;
    }
    setError(undefined);
    try {
      const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete workspace");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete workspace");
    }
  };

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="flex h-12 items-center gap-3 border-border border-b px-4 sm:px-6">
        <span className="font-medium text-sm tracking-tight">eve workspaces</span>
        <div className="ml-auto">
          <UserMenu variant="inline" />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-medium text-2xl tracking-tight">Workspaces</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Open an existing workspace or create a new one.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="h-9 w-48"
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void create();
              }}
              placeholder="New workspace name"
              value={title}
            />
            <Button disabled={creating} onClick={() => void create()} type="button">
              <PlusIcon className="size-4" />
              New workspace
            </Button>
            <Button
              aria-label="Refresh"
              disabled={loading}
              onClick={() => void load()}
              size="icon"
              type="button"
              variant="outline"
            >
              <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-border border-b bg-muted/40 text-[11px] text-muted-foreground uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Chats</th>
                <th className="px-4 py-2.5 font-medium">Created</th>
                <th className="px-4 py-2.5 font-medium">Id</th>
                <th className="px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {loading && workspaces.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {!loading && workspaces.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>
                    No workspaces yet. Create one to get started.
                  </td>
                </tr>
              ) : null}
              {workspaces.map((workspace) => (
                <tr
                  className="cursor-pointer border-border border-b last:border-b-0 hover:bg-accent/50"
                  key={workspace.id}
                  onClick={() => router.push(`/w/${encodeURIComponent(workspace.id)}`)}
                >
                  <td className="px-4 py-3 font-medium">{workspace.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{workspace.chatCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(workspace.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                    {workspace.id}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <Button
                      aria-label={`Delete ${workspace.title}`}
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        void remove(workspace.id, workspace.title);
                      }}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function formatDate(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}
