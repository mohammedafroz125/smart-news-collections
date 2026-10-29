import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Domestic News Collections" },
      { name: "description", content: "Choose a new password for your newsroom admin account." },
      { property: "og:title", content: "Set a new password" },
      { property: "og:description", content: "Choose a new password for your newsroom admin account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleReset() {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password updated. You are signed in.");
      navigate({ to: "/admin", replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="font-display text-2xl font-black text-foreground">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the new password next time you sign in to the admin console.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleReset()}
            />
          </div>
          <Button onClick={handleReset} disabled={busy || !password || !confirm}>
            {busy ? "Updating…" : "Update password"}
          </Button>
        </div>
      </div>
    </div>
  );
}
