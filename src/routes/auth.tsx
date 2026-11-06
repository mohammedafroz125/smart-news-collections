import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ADMIN_EMAIL } from "@/lib/admin-identity";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Domestic News Collections" },
      {
        name: "description",
        content: "Sign in to the newsroom admin console of Domestic News Collections using ML.",
      },
      { property: "og:title", content: "Sign in — Domestic News Collections" },
      { property: "og:description", content: "Sign in to the newsroom admin console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function handleSignIn() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (data.user.email?.trim().toLowerCase() !== ADMIN_EMAIL) {
        await supabase.auth.signOut();
        toast.error("This sign-in is restricted to the admin account.");
        return;
      }
      navigate({ to: "/admin", replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <div className="w-full rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="font-display text-2xl font-black text-foreground">Admin sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
            Sign in with the fixed admin email and password.
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signin-email">Email</Label>
            <Input
              id="signin-email"
              type="email"
              autoComplete="email"
              value={ADMIN_EMAIL}
              readOnly
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signin-password">Password</Label>
            <Input
              id="signin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSignIn()}
            />
          </div>
          <Button onClick={handleSignIn} disabled={busy || !password}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      </div>
    </div>
  );
}
