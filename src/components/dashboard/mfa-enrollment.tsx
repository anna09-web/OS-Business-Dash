"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Factor = { id: string; friendly_name?: string; status: string };
type EnrollState =
  | { step: "idle" }
  | { step: "enrolling"; factorId: string; qrCode: string; secret: string };

export function MfaEnrollment() {
  const supabase = createClient();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [state, setState] = useState<EnrollState>({ step: "idle" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setFactors(data?.totp ?? []);
    });
  }, [supabase]);

  async function startEnrollment() {
    setError(null);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error) {
      setError(error.message);
      return;
    }
    setState({
      step: "enrolling",
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }

  async function verifyEnrollment() {
    if (state.step !== "enrolling") return;
    setPending(true);
    setError(null);

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: state.factorId,
      code,
    });

    setPending(false);

    if (error) {
      setError(error.message);
      return;
    }

    setState({ step: "idle" });
    setCode("");
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
  }

  async function unenroll(factorId: string) {
    setPending(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }
    setFactors((prev) => prev?.filter((f) => f.id !== factorId) ?? null);
  }

  if (factors === null) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const verifiedFactor = factors.find((f) => f.status === "verified");

  if (verifiedFactor) {
    return (
      <div className="flex items-center justify-between rounded-md border border-success/30 bg-success/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-success">
          <ShieldCheck className="size-4" />
          Two-factor authentication is enabled
          {verifiedFactor.friendly_name ? ` (${verifiedFactor.friendly_name})` : ""}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => unenroll(verifiedFactor.id)}
        >
          Disable
        </Button>
      </div>
    );
  }

  if (state.step === "enrolling") {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-sm text-warning">
          <ShieldOff className="size-4" />
          Scan this QR code with an authenticator app, then enter the 6-digit code.
        </p>
        <img
          src={state.qrCode}
          alt="TOTP QR code"
          className="size-40 rounded-md bg-white p-2"
        />
        <p className="font-mono text-xs text-muted-foreground">
          Manual entry key: {state.secret}
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mfa-code">6-digit code</Label>
          <Input
            id="mfa-code"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button onClick={verifyEnrollment} disabled={pending || code.length < 6}>
            Verify and enable
          </Button>
          <Button variant="ghost" onClick={() => setState({ step: "idle" })}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldOff className="size-4" />
        Two-factor authentication is not enabled
      </div>
      <Button size="sm" onClick={startEnrollment}>
        Enable 2FA
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
