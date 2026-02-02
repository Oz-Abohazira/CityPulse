import { Link } from "react-router-dom";
import { Shield, UserCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">VetMe</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              How it Works
            </Link>
            <Link to="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link to="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Trust & Safety
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Trusted by 10,000+ landlords and property managers
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Secure Roommate Verification,{" "}
            <span className="text-primary">Made Simple</span>
          </h1>
          <p className="mb-12 text-lg text-muted-foreground md:text-xl">
            VetMe provides comprehensive background checks with credit summaries, 
            criminal records, and income verification—all with candidate consent 
            and full compliance.
          </p>

          {/* Role Selection Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            <Link to="/dashboard" className="block">
              <Card className="group cursor-pointer border-2 border-border bg-card transition-all duration-300 hover:border-primary hover:shadow-card">
                <CardContent className="flex flex-col items-center p-8">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <UserCheck className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="mb-2 text-xl font-semibold text-foreground">
                    I need to vet a roommate
                  </h2>
                  <p className="mb-6 text-sm text-muted-foreground">
                    Request background checks and view comprehensive reports on potential roommates
                  </p>
                  <Button className="w-full gap-2 group-hover:gap-3 transition-all">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            <Link to="/verify" className="block">
              <Card className="group cursor-pointer border-2 border-border bg-card transition-all duration-300 hover:border-primary hover:shadow-card">
                <CardContent className="flex flex-col items-center p-8">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent transition-colors group-hover:bg-primary/20">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="mb-2 text-xl font-semibold text-foreground">
                    I've been asked to verify
                  </h2>
                  <p className="mb-6 text-sm text-muted-foreground">
                    Complete your identity verification securely and share your verified profile
                  </p>
                  <Button variant="outline" className="w-full gap-2 group-hover:gap-3 transition-all">
                    Verify My Identity
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mx-auto mt-20 max-w-4xl">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { label: "Verifications", value: "50K+" },
              { label: "Avg. Report Time", value: "< 24hrs" },
              { label: "Compliance Rate", value: "100%" },
              { label: "User Satisfaction", value: "4.9/5" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:flex-row">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">VetMe</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 VetMe. All rights reserved. FCRA Compliant.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
