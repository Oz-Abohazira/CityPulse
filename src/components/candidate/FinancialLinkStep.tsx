import { useState } from "react";
import { Landmark, ArrowLeft, ArrowRight, Building2, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FinancialLinkStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function FinancialLinkStep({ onNext, onBack }: FinancialLinkStepProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    // Simulate Plaid connection
    setTimeout(() => {
      setIsConnecting(false);
      setConnected(true);
    }, 2000);
  };

  if (connected) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">
            Bank Account Connected
          </h3>
          <p className="mb-2 text-muted-foreground">
            Successfully linked to your financial institution.
          </p>
          <p className="mb-6 text-sm text-muted-foreground">
            Your income has been verified automatically.
          </p>
          <Button onClick={onNext} className="gap-2">
            Complete Verification
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Landmark className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-xl">Link Your Bank Account</CardTitle>
        <p className="text-sm text-muted-foreground">
          Securely connect your bank to verify your income
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plaid-style connection card */}
        <div className="rounded-xl border-2 border-border bg-gradient-to-b from-muted/30 to-background p-6 text-center">
          <div className="mb-4 flex justify-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
              <Building2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="flex items-center">
              <div className="h-0.5 w-8 bg-border" />
              <Lock className="mx-1 h-4 w-4 text-muted-foreground" />
              <div className="h-0.5 w-8 bg-border" />
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-primary/10 shadow-sm">
              <Landmark className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h4 className="mb-1 font-medium text-foreground">
            Secure Bank Connection
          </h4>
          <p className="mb-4 text-sm text-muted-foreground">
            Powered by bank-level encryption. Your credentials are never stored.
          </p>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full gap-2"
            size="lg"
          >
            {isConnecting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Connecting...
              </>
            ) : (
              <>
                <Landmark className="h-4 w-4" />
                Connect Bank Account
              </>
            )}
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-foreground">256-bit</div>
            <div className="text-xs text-muted-foreground">Encryption</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-foreground">10,000+</div>
            <div className="text-xs text-muted-foreground">Banks</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-foreground">Read-only</div>
            <div className="text-xs text-muted-foreground">Access</div>
          </div>
        </div>

        <div className="pt-2">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
