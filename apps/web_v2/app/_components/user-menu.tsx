"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function UserMenu({
  className,
  variant = "fixed",
}: {
  readonly className?: string;
  readonly variant?: "fixed" | "inline";
}) {
  const router = useRouter();
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm",
        variant === "fixed"
          ? "fixed top-3 right-3 z-50 rounded-lg border border-border bg-card/90 px-3 py-1.5 shadow-xs backdrop-blur"
          : "px-1",
        className,
      )}
    >
      <span className="max-w-40 truncate text-muted-foreground">{session.user.email}</span>
      <Button
        onClick={async () => {
          await signOut();
          router.push("/sign-in");
          router.refresh();
        }}
        size="sm"
        type="button"
        variant="ghost"
      >
        Sign out
      </Button>
    </div>
  );
}
