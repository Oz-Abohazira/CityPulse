import { useState } from "react";
import { Shield, Check } from "lucide-react";
import { ConsentStep } from "@/components/candidate/ConsentStep";
import { IDVerificationStep } from "@/components/candidate/IDVerificationStep";
import { FinancialLinkStep } from "@/components/candidate/FinancialLinkStep";
import { SuccessStep } from "@/components/candidate/SuccessStep";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, title: "Consent", description: "Review & sign" },
  { id: 2, title: "Identity", description: "Verify your ID" },
  { id: 3, title: "Financial", description: "Link account" },
  { id: 4, title: "Complete", description: "You're done!" },
];

const CandidateFlow = () => {
  const [currentStep, setCurrentStep] = useState(1);

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <ConsentStep onNext={handleNext} />;
      case 2:
        return <IDVerificationStep onNext={handleNext} onBack={handleBack} />;
      case 3:
        return <FinancialLinkStep onNext={handleNext} onBack={handleBack} />;
      case 4:
        return <SuccessStep />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center justify-center px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">VetMe</span>
          </div>
        </div>
      </header>

      {/* Progress Stepper */}
      <div className="border-b border-border bg-card py-6">
        <div className="container mx-auto px-4">
          <nav aria-label="Progress" className="mx-auto max-w-2xl">
            <ol className="flex items-center justify-between">
              {steps.map((step, index) => (
                <li key={step.id} className="relative flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                        currentStep > step.id
                          ? "border-success bg-success"
                          : currentStep === step.id
                          ? "border-primary bg-primary"
                          : "border-border bg-card"
                      )}
                    >
                      {currentStep > step.id ? (
                        <Check className="h-5 w-5 text-success-foreground" />
                      ) : (
                        <span
                          className={cn(
                            "text-sm font-medium",
                            currentStep === step.id
                              ? "text-primary-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {step.id}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          currentStep >= step.id
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {step.title}
                      </p>
                      <p className="hidden text-xs text-muted-foreground sm:block">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        "absolute left-[calc(50%+20px)] top-5 h-0.5 w-[calc(100%-40px)] -translate-y-1/2",
                        currentStep > step.id ? "bg-success" : "bg-border"
                      )}
                    />
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>

      {/* Step Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-lg animate-fade-in">{renderStep()}</div>
      </main>
    </div>
  );
};

export default CandidateFlow;
