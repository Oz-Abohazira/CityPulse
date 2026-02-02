import { useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  Shield,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { AdverseActionModal } from "@/components/dashboard/AdverseActionModal";
import type { Request } from "@/pages/RequesterDashboard";

interface ReportViewProps {
  request: Request;
  onBack: () => void;
}

export function ReportView({ request, onBack }: ReportViewProps) {
  const [isAdverseModalOpen, setIsAdverseModalOpen] = useState(false);
  const report = request.reportData;

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">Report data not available yet.</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const getCreditScoreColor = (min: number) => {
    if (min >= 700) return "text-success";
    if (min >= 600) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {request.name}
            </h2>
            <p className="text-sm text-muted-foreground">{request.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setIsAdverseModalOpen(true)}
          >
            <Mail className="h-4 w-4" />
            Adverse Action
          </Button>
          <Button className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </Button>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Credit Summary */}
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base font-medium">Credit Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2">
              <span className="text-sm text-muted-foreground">Score Range</span>
              <p
                className={`text-3xl font-bold ${getCreditScoreColor(report.creditScore.min)}`}
              >
                {report.creditScore.min} - {report.creditScore.max}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {report.creditScore.min >= 700 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm text-success">Excellent</span>
                </>
              ) : report.creditScore.min >= 600 ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="text-sm text-warning">Fair</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">Needs Review</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Criminal Check */}
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base font-medium">Criminal Check</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <div className="mt-1">
                {report.criminalCheck === "clear" ? (
                  <StatusBadge variant="ready" className="text-base px-4 py-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Clear
                  </StatusBadge>
                ) : (
                  <StatusBadge variant="action" className="text-base px-4 py-2">
                    <AlertTriangle className="h-4 w-4" />
                    Alert Found
                  </StatusBadge>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {report.criminalCheck === "clear"
                ? "No records found in national databases"
                : "Records found - review required"}
            </p>
          </CardContent>
        </Card>

        {/* Income Verification */}
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base font-medium">Income Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <div className="mt-1">
                {report.incomeVerification === "verified" ? (
                  <StatusBadge variant="ready" className="text-base px-4 py-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Verified
                  </StatusBadge>
                ) : (
                  <StatusBadge variant="pending" className="text-base px-4 py-2">
                    <AlertTriangle className="h-4 w-4" />
                    Unverified
                  </StatusBadge>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {report.incomeVerification === "verified"
                ? "Bank account connected and income confirmed"
                : "Candidate has not linked bank account"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Footer */}
      <Card className="shadow-soft">
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            <p>
              Report generated on{" "}
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p>This report is valid for 30 days from the generation date.</p>
          </div>
          <Button variant="outline">Download PDF</Button>
        </CardContent>
      </Card>

      <AdverseActionModal
        open={isAdverseModalOpen}
        onOpenChange={setIsAdverseModalOpen}
        candidateName={request.name}
        candidateEmail={request.email}
      />
    </div>
  );
}
