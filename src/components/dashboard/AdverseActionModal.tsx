import { Copy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface AdverseActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  candidateEmail: string;
}

export function AdverseActionModal({
  open,
  onOpenChange,
  candidateName,
  candidateEmail,
}: AdverseActionModalProps) {
  const { toast } = useToast();

  const emailTemplate = `Dear ${candidateName},

We regret to inform you that we are unable to proceed with your roommate application at this time. This decision was based, in whole or in part, on information contained in a consumer report obtained from VetMe, a consumer reporting agency.

VetMe was not involved in making this decision and is unable to provide you with the specific reasons for this decision. However, under the Fair Credit Reporting Act, you have certain rights:

1. You have the right to obtain a free copy of your consumer report from VetMe within 60 days of this notice.

2. You have the right to dispute the accuracy or completeness of any information in your consumer report.

3. You have the right to receive a description of your rights under the Fair Credit Reporting Act.

To obtain a copy of your report or to dispute any information, please contact:
VetMe Consumer Support
support@vetme.com
1-800-VET-MEXX

We appreciate your interest and wish you the best in your search.

Sincerely,
[Your Name]`;

  const handleCopy = () => {
    navigator.clipboard.writeText(emailTemplate);
    toast({
      title: "Copied to clipboard",
      description: "The email template has been copied.",
    });
  };

  const handleSend = () => {
    window.location.href = `mailto:${candidateEmail}?subject=Notice of Adverse Action&body=${encodeURIComponent(emailTemplate)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Adverse Action Notice</DialogTitle>
          <DialogDescription>
            If you decide not to proceed with this candidate based on the
            background check, you are required by the FCRA to send an adverse
            action notice. Use the template below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/50 p-1">
            <Textarea
              value={emailTemplate}
              readOnly
              className="min-h-[300px] resize-none border-0 bg-transparent font-mono text-sm focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Recipient:</span>
            <span className="font-medium text-foreground">{candidateEmail}</span>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCopy} className="gap-2">
            <Copy className="h-4 w-4" />
            Copy Template
          </Button>
          <Button onClick={handleSend} className="gap-2">
            <Send className="h-4 w-4" />
            Open in Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
