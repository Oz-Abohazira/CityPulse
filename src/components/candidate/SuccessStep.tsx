import { ShieldCheck, Home, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

export function SuccessStep() {
  return (
    <Card className="shadow-card overflow-hidden">
      {/* Success header with gradient */}
      <div className="bg-gradient-to-br from-success/10 via-success/5 to-transparent px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success">
            <ShieldCheck className="h-8 w-8 text-success-foreground" />
          </div>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">
          Passport Secured! 🎉
        </h2>
        <p className="text-muted-foreground">
          Your verification is complete and has been securely shared.
        </p>
      </div>

      <CardContent className="space-y-6 p-6">
        {/* Verification Summary */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h4 className="mb-3 font-medium text-foreground">
            Verification Complete
          </h4>
          <div className="space-y-2">
            {[
              "Identity verified via government ID",
              "Credit check authorization submitted",
              "Income verification linked",
              "Background check in progress",
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What's next */}
        <div className="text-center">
          <h4 className="mb-2 font-medium text-foreground">What happens next?</h4>
          <p className="mb-6 text-sm text-muted-foreground">
            The person who requested your verification will receive your report
            within 24-48 hours. You'll receive an email notification when it's ready.
          </p>
        </div>

        <Link to="/" className="block">
          <Button variant="outline" className="w-full gap-2">
            <Home className="h-4 w-4" />
            Return to Home
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
