import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ADMIN_EMAIL } from "@/lib/admin-identity";

export const Route = createFileRoute("/_authenticated/_admin/settings")({
  head: () => ({
    meta: [
      { title: "Admin Settings — Domestic News Collections" },
      { name: "description", content: "View the fixed admin email and securely change the password." },
      { property: "og:title", content: "Admin Settings" },
      { property: "og:description", content: "View admin account details and change the password securely." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function PasswordChange() {
  const [step, setStep] = useState<"ready" | "otp" | "new">("ready");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(ADMIN_EMAIL, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setStep("otp");
      toast.success(`A verification code was sent to ${ADMIN_EMAIL}.`);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    const token = code.trim();
    if (!token) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: ADMIN_EMAIL, token, type: "recovery" });
      if (error) {
        toast.error("That code is not valid or has expired.");
        return;
      }
      setStep("new");
    } finally {
      setBusy(false);
    }
  }

  async function savePassword() {
    if (password.length < 6) {
      toast.error("The new password must be at least 6 characters.");
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
      toast.success("Password updated. Use it the next time you sign in.");
      setStep("ready");
      setCode("");
      setPassword("");
      setConfirm("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 border-t border-border pt-6">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-bold text-foreground">Change password</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        A one-time verification code will be sent to {ADMIN_EMAIL}. The new password can only be saved after the code is verified.
      </p>
      {step === "ready" && (
        <Button onClick={sendCode} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Send verification code
        </Button>
      )}
      {step === "otp" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password-otp">Verification code</Label>
            <Input
              id="password-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && verifyCode()}
              placeholder="Enter the code from your email"
            />
          </div>
          <Button onClick={verifyCode} disabled={busy || !code.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verify code
          </Button>
        </div>
      )}
      {step === "new" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && savePassword()}
              placeholder="Enter the new password again"
            />
          </div>
          <Button onClick={savePassword} disabled={busy || !password || !confirm}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Save new password
          </Button>
        </div>
      )}
    </section>
  );
}

function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker text-accent-foreground">Account security</p>
          <h1 className="font-display text-3xl font-black text-foreground">Admin settings</h1>
        </div>
        <Button variant="outline" asChild>
          <Link to="/admin">
            <ArrowLeft className="h-4 w-4" />
            Back to admin
          </Link>
        </Button>
      </div>

      <div className="mt-6 max-w-2xl">
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-lg font-bold text-foreground">Admin account</h2>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-email">Admin email · fixed</Label>
            <Input id="admin-email" type="email" value={ADMIN_EMAIL} readOnly />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-password-display">Password</Label>
            <Input id="admin-password-display" type="password" value="password-is-not-readable" readOnly />
            <p className="text-xs text-muted-foreground">For your security, the current password cannot be displayed.</p>
          </div>
        </section>
        <PasswordChange />
      </div>
    </div>
  );
}