import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function handleSignUp() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (data.session) {
        navigate({ to: "/admin", replace: true });
      } else {
        toast.success("Account created. Check your email inbox for the confirmation link, then sign in.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSignIn() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        return;
      }
      navigate({ to: "/admin", replace: true });
    } finally {
      setBusy(false);
    }
  }

  async function handleSocial(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/admin", replace: true });
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <div className="w-full rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="font-display text-2xl font-black text-foreground">Newsroom admin sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Managing sources and collections requires an admin account. The first account created becomes the
          admin.
        </p>

        <Tabs defaultValue="signin" className="mt-5">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
            <Button onClick={handleSignIn} disabled={busy || !email || !password}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </TabsContent>
          <TabsContent value="signup" className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleSignUp()}
              />
              <p className="text-xs text-muted-foreground">At least 6 characters.</p>
            </div>
            <Button onClick={handleSignUp} disabled={busy || !email || password.length < 6}>
              {busy ? "Creating account…" : "Create account"}
            </Button>
          </TabsContent>
        </Tabs>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or continue with
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={() => handleSocial("google")} disabled={busy}>
            Continue with Google
          </Button>
          <button type="button" className="lovable-auth-button" onClick={() => handleSocial("lovable")} disabled={busy}>
            Continue with Lovable
          </button>
        </div>
      </div>
    </div>
  );
}
