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

function Field({
  id,
  label,
  hint,
  ...inputProps
}: {
  id: string;
  label: string;
  hint?: string;
} & React.ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...inputProps} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function VerifyButton({
  label,
  busy,
  onClick,
  disabled,
}: {
  label: string;
  busy: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button onClick={onClick} disabled={busy || disabled}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
      {label}
    </Button>
  );
}

async function verifyCurrentPassword(email: string, currentPassword: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (error) {
    toast.error("The current password is not correct. Nothing was changed.");
    return false;
  }
  return true;
}

// Step 1 of both flows: prove you are the real account holder by entering the
// current password before anything can be sent or changed.
function CurrentPasswordStep({
  email,
  onVerified,
  busy,
  setBusy,
  intro,
}: {
  email: string;
  onVerified: () => void;
  busy: boolean;
  setBusy: (value: boolean) => void;
  intro: string;
}) {
  const [currentPassword, setCurrentPassword] = useState("");

  async function submit() {
    setBusy(true);
    try {
      if (await verifyCurrentPassword(email, currentPassword)) onVerified();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{intro}</p>
      <Field
        id={`current-password-${intro.slice(0, 8)}`}
        label="Current password"
        type="password"
        autoComplete="current-password"
        placeholder="Enter your current password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && currentPassword && submit()}
      />
      <VerifyButton label="Verify my account" busy={busy} onClick={submit} disabled={!currentPassword} />
    </div>
  );
}

function CodeStep({
  idPrefix,
  prompt,
  hint,
  onVerify,
  busy,
}: {
  idPrefix: string;
  prompt: string;
  hint: string;
  onVerify: (code: string) => void;
  busy: boolean;
}) {
  const [code, setCode] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{prompt}</p>
      <Field
        id={`${idPrefix}-code`}
        label="Verification code"
        inputMode="numeric"
        placeholder="Code from the email"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && code.trim() && onVerify(code)}
        hint={hint}
      />
      <VerifyButton label="Verify code" busy={busy} onClick={() => onVerify(code)} disabled={!code.trim()} />
    </div>
  );
}

// When a verification email arrives as a secure link rather than a typed code,
// clicking the link signs the account in again — that click itself proves the
// inbox is owned, so we accept it as the verification step.
function useLinkVerification(onVerified: () => void) {
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
  }, []);
  return awaiting;
}

function PasswordChange({ email }: { email: string }) {
  const [step, setStep] = useState<"password" | "otp" | "new">("password");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const linkVerified = useLinkVerification(() => setStep("new"));

  async function verifyAndSend() {
    setBusy(true);
    try {
      const { error: sendError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (sendError) {
        toast.error(sendError.message);
        return;
      }
      linkVerified.current = true;
      setStep("otp");
      toast.success(`Verification email sent to ${email}.`);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(code: string) {
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "recovery" });
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
      setStep("password");
      setPassword("");
      setConfirm("");
    } finally {
      setBusy(false);
    }
  }

  const stepLabels = ["Verify account", "Verify email", "Set new password"];
  const stepIndex = step === "password" ? 0 : step === "otp" ? 1 : 2;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-bold text-foreground">Change password</h2>
      </div>
      <ol className="flex flex-wrap gap-2 text-xs">
        {stepLabels.map((label, index) => (
          <li
            key={label}
            className={
              index === stepIndex
                ? "rounded-full border border-primary bg-primary/10 px-2.5 py-1 text-primary"
                : index < stepIndex
                  ? "rounded-full border border-border px-2.5 py-1 text-sentiment-positive"
                  : "rounded-full border border-border px-2.5 py-1 text-muted-foreground"
            }
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      {step === "password" && (
        <CurrentPasswordStep
          email={email}
          intro="First, confirm it is really you. Enter your current password, and a verification email will be sent to your registered address."
          onVerified={verifyAndSend}
          busy={busy}
          setBusy={setBusy}
        />
      )}
      {step === "otp" && (
        <CodeStep
          idPrefix="password"
          prompt={`A verification email was sent to ${email}. Enter the code from that email.`}
          hint="If the email shows a secure link instead of a code, just open that link and the password page will finish the change."
          onVerify={verifyCode}
          busy={busy}
        />
      )}
      {step === "new" && (
        <div className="flex flex-col gap-3">
          <Field
            id="new-password"
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Field
            id="confirm-password"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            placeholder="Type the new password again"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && password && confirm && savePassword()}
          />
          <Button onClick={savePassword} disabled={busy || !password || !confirm}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Save new password
          </Button>
        </div>
      )}
    </div>
  );
}

function EmailChange({ email }: { email: string }) {
  const [step, setStep] = useState<"password" | "identity" | "new" | "confirm">("password");
  const [busy, setBusy] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const linkVerified = useLinkVerification(() => setStep("new"));

  async function verifyAndSend() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      linkVerified.current = true;
      setStep("identity");
      toast.success(`Verification email sent to ${email}.`);
    } finally {
      setBusy(false);
    }
  }

  async function verifyIdentity(code: string) {
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "magiclink" });
      if (error) {
        toast.error("That code is not valid or has expired.");
        return;
      }
      setStep("new");
    } finally {
      setBusy(false);
    }
  }

  async function submitNewEmail() {
    const candidate = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (candidate === email.toLowerCase()) {
      toast.error("That is already the current email.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: candidate });
      if (error) {
        toast.error(error.message);
        return;
      }
      setStep("confirm");
      toast.success(`A confirmation email was sent to ${candidate}.`);
    } finally {
      setBusy(false);
    }
  }

  async function verifyChange(code: string) {
    const candidate = newEmail.trim().toLowerCase();
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: candidate,
        token: code.trim(),
        type: "email_change",
      });
      if (error) {
        toast.error("That code is not valid or has expired.");
        return;
      }
      toast.success("Email address updated. Sign in with the new email from now on.");
      setStep("password");
      setNewEmail("");
    } finally {
      setBusy(false);
    }
  }

  const stepLabels = ["Verify account", "Verify email", "Enter new email", "Confirm new email"];
  const stepIndex = step === "password" ? 0 : step === "identity" ? 1 : step === "new" ? 2 : 3;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-bold text-foreground">Change admin email</h2>
      </div>
      <ol className="flex flex-wrap gap-2 text-xs">
        {stepLabels.map((label, index) => (
          <li
            key={label}
            className={
              index === stepIndex
                ? "rounded-full border border-primary bg-primary/10 px-2.5 py-1 text-primary"
                : index < stepIndex
                  ? "rounded-full border border-border px-2.5 py-1 text-sentiment-positive"
                  : "rounded-full border border-border px-2.5 py-1 text-muted-foreground"
            }
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      {step === "password" && (
        <CurrentPasswordStep
          email={email}
          intro="First, confirm it is really you. Enter your current password, and a verification email will be sent to your registered address."
          onVerified={verifyAndSend}
          busy={busy}
          setBusy={setBusy}
        />
      )}
      {step === "identity" && (
        <CodeStep
          idPrefix="identity"
          prompt={`A verification email was sent to ${email}. Enter the code from that email to prove the address is yours.`}
          hint="If the email shows a secure link instead of a code, just open that link — this page continues automatically."
          onVerify={verifyIdentity}
          busy={busy}
        />
      )}
      {step === "new" && (
        <div className="flex flex-col gap-3">
          <Field
            id="new-email"
            label="New email address"
            type="email"
            autoComplete="email"
            placeholder="new.admin@example.com"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && newEmail && submitNewEmail()}
          />
          <Button onClick={submitNewEmail} disabled={busy || !newEmail.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Request the change
          </Button>
        </div>
      )}
      {step === "confirm" && (
        <>
          <CodeStep
            idPrefix="confirm-email"
            prompt={`A confirmation email was sent to ${newEmail.trim()}. Enter the code from that email to complete the change.`}
            hint="The change only applies after this confirmation, so the new address must really receive its email."
            onVerify={verifyChange}
            busy={busy}
          />
          <p className="text-xs text-muted-foreground">
            Until you confirm, the current address {email} stays in charge.
          </p>
        </>
      )}
    </div>
  );
}

function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setLoading(false);
    });
  }, []);

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

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !email ? (
        <div className="mt-8 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Could not read the signed-in account. Sign in again and return to this page.
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{email}</span>. Every change below follows the
            same secure routine: confirm your current password, verify a code sent to the registered email, then apply
            the change.
          </p>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-5">
              <PasswordChange email={email} />
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <EmailChange email={email} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
