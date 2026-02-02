import { useState } from "react";
import { Camera, Upload, ArrowLeft, ArrowRight, User, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface IDVerificationStepProps {
  onNext: () => void;
  onBack: () => void;
}

type VerificationMode = "camera" | "upload";

export function IDVerificationStep({ onNext, onBack }: IDVerificationStepProps) {
  const [mode, setMode] = useState<VerificationMode | null>(null);
  const [step, setStep] = useState<"select" | "capture" | "selfie" | "complete">("select");

  const handleCapture = () => {
    if (step === "capture") {
      setStep("selfie");
    } else if (step === "selfie") {
      setStep("complete");
    }
  };

  const handleStartVerification = (selectedMode: VerificationMode) => {
    setMode(selectedMode);
    setStep("capture");
  };

  if (step === "complete") {
    return (
      <Card className="shadow-card">
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <User className="h-8 w-8 text-success" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">
            Identity Verified
          </h3>
          <p className="mb-6 text-muted-foreground">
            Your ID has been successfully captured and verified.
          </p>
          <Button onClick={onNext} className="gap-2">
            Continue to Financial Link
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "capture" || step === "selfie") {
    return (
      <Card className="shadow-card">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {step === "capture" ? "Scan Your ID" : "Take a Selfie"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {step === "capture"
              ? "Position your government-issued ID within the frame"
              : "Take a selfie to verify your identity matches your ID"}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Camera Preview Placeholder */}
          <div className="relative mx-auto aspect-[4/3] max-w-sm overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/50">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              {step === "capture" ? (
                <>
                  <div className="flex h-24 w-36 items-center justify-center rounded-lg border-2 border-primary bg-primary/5">
                    <CreditCard className="h-12 w-12 text-primary/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Align ID within the frame
                  </p>
                </>
              ) : (
                <>
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-primary bg-primary/5">
                    <User className="h-14 w-14 text-primary/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Position your face in the circle
                  </p>
                </>
              )}
            </div>
            {/* Camera corners */}
            <div className="absolute left-4 top-4 h-8 w-8 border-l-2 border-t-2 border-primary" />
            <div className="absolute right-4 top-4 h-8 w-8 border-r-2 border-t-2 border-primary" />
            <div className="absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-primary" />
            <div className="absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-primary" />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep("select")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleCapture} className="flex-1 gap-2">
              <Camera className="h-4 w-4" />
              {step === "capture" ? "Capture ID" : "Take Photo"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <CreditCard className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-xl">Verify Your Identity</CardTitle>
        <p className="text-sm text-muted-foreground">
          We'll need to verify your identity using a government-issued ID
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <button
          type="button"
          onClick={() => handleStartVerification("camera")}
          className={cn(
            "flex w-full items-center gap-4 rounded-lg border-2 border-border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-accent"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Camera className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Use Camera</p>
            <p className="text-sm text-muted-foreground">
              Take a photo of your ID with your device camera
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleStartVerification("upload")}
          className={cn(
            "flex w-full items-center gap-4 rounded-lg border-2 border-border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-accent"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Upload Photo</p>
            <p className="text-sm text-muted-foreground">
              Upload an existing photo of your ID
            </p>
          </div>
        </button>

        <div className="pt-4">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
