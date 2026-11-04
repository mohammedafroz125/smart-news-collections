import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/_admin/settings")({
  head: () => ({
    meta: [
      { title: "Admin Settings — Domestic News Collections" },
      {
        name: "description",
        content: "Change the admin account email and password with secure email verification.",
      },
      { property: "og:title", content: "Admin Settings" },
      { property: "og:description", content: "Change the admin email and password securely." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

type Busy = { busy: boolean };

function useIdentityVerification(
  step: string,
  onVerified: () => void,
) {
  // When the verification email is a link (not a typed code), clicking it signs the
  // user in again — that click itself proves the inbox, so we accept it as verified.
  const awaiting = useRef(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" && awaiting.current) {
        awaiting.current = false;
        onVerified();
      }
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  return awaiting;
}

function CodeStep({
  title,
  hint,
  onVerify,
  busy,
  buttonLabel,
}: {
  title: string;
  hint: string;
  onVerify: () => void;
  busy: boolean;
  buttonLabel: string;
}) {
  const [code, setCode] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{title}</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`code-${title.replace(/\s+/g, "-").toLowerCase()}`}>Verification code</Label>
        <Input
          id={`code-${title.replace(/\s+/g, "-").toLowerCase()}`}
          inputMode="numeric"
          placeholder="6-digit code from your email"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && code.trim() && onVerify()}
        />
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Button onClick={onVerify} disabled={busy || !code.trim()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {buttonLabel}
      </Button>
    </div>
  );
}

function CurrentPasswordStep({
  onSubmit,
  busy,
}: {
  onSubmit: () => void;
  busy: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`current-password-${onSubmit.name}`}>Current password</Label>
        <Input
          id={`current-password-${onSubmit.name}`}
          type="password"
          autoComplete="current-password"
          placeholder="Enter your current password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && currentPassword && onSubmit()}
        />
      </div>
      <Button onClick={() => onSubmit()} disabled={busy || !currentPassword}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Verify account
      </Button>
    </div>
  );
}
