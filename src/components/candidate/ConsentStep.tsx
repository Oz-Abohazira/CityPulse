import { useState, useRef } from "react";
import { FileText, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ConsentStepProps {
  onNext: () => void;
}

export function ConsentStep({ onNext }: ConsentStepProps) {
  const [expanded, setExpanded] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [signed, setSigned] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "hsl(222 47% 11%)";
    ctx.lineTo(x, y);
    ctx.stroke();
    setSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
  };

  const disclosureText = `DISCLOSURE AND AUTHORIZATION FOR BACKGROUND CHECK

By signing below, I hereby authorize VetMe and its designated agents and representatives to conduct a comprehensive background investigation on me as required for roommate verification purposes.

I understand that this background check may include, but is not limited to:
• Consumer credit history and credit score
• Criminal history records from federal, state, and local jurisdictions
• Identity verification
• Employment and income verification
• Eviction history
• Public records search

I acknowledge that I have received the "Summary of Rights Under the Fair Credit Reporting Act" and understand my rights under this law.

I certify that all information I have provided is true and complete to the best of my knowledge. I understand that any misrepresentation or omission may result in denial of my application.

I understand that I may request a copy of any reports obtained as a result of this authorization.

This authorization shall remain in effect for a period of one year from the date of my signature unless I revoke it in writing.`;

  return (
    <Card className="shadow-card">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <FileText className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-xl">Authorization & Consent</CardTitle>
        <p className="text-sm text-muted-foreground">
          Please review and sign the disclosure below to proceed
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Disclosure */}
        <div className="rounded-lg border border-border bg-muted/30">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between p-4 text-left"
          >
            <span className="font-medium text-foreground">
              Background Check Disclosure
            </span>
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          {expanded && (
            <div className="border-t border-border p-4">
              <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap font-sans text-sm text-muted-foreground">
                {disclosureText}
              </pre>
            </div>
          )}
        </div>

        {/* Agreement Checkbox */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="agree"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
          />
          <Label htmlFor="agree" className="text-sm leading-relaxed cursor-pointer">
            I have read and agree to the background check disclosure and
            authorize VetMe to conduct the investigation as described above.
          </Label>
        </div>

        {/* Signature Pad */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Digital Signature</Label>
          <div className="relative rounded-lg border-2 border-dashed border-border bg-card">
            <canvas
              ref={canvasRef}
              width={400}
              height={120}
              className="w-full cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!signed && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Sign here with your mouse or finger
                </p>
              </div>
            )}
          </div>
          {signed && (
            <Button variant="ghost" size="sm" onClick={clearSignature}>
              Clear Signature
            </Button>
          )}
        </div>

        <Button
          onClick={onNext}
          disabled={!agreed || !signed}
          className="w-full gap-2"
          size="lg"
        >
          <Check className="h-4 w-4" />
          Continue to Identity Verification
        </Button>
      </CardContent>
    </Card>
  );
}
