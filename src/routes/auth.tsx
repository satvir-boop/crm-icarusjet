import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plane } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Sign in — Icarus Jet CRM" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Plane className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Icarus Jet CRM</span>
        </div>

        <Card className="p-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold">
              {mode === "signin" ? "Sign in" : "Create account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Welcome back. Sign in to manage your charters."
                : "Get started — demo data is loaded automatically."}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                No account?{" "}
                <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => setMode("signup")}>
                  Create one
                </button>
              </>
            ) : (
              <>
                Already registered?{" "}
                <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => setMode("signin")}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
