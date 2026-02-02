import { Eye, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Request } from "@/pages/RequesterDashboard";

interface RequestsTableProps {
  requests: Request[];
  onViewReport: (request: Request) => void;
}

const statusLabels: Record<Request["status"], string> = {
  pending: "Pending Candidate",
  verifying: "Verifying Identity",
  ready: "Report Ready",
  action: "Action Required",
};

export function RequestsTable({ requests, onViewReport }: RequestsTableProps) {
  return (
    <Card className="shadow-soft animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">All Requests</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium">Candidate</TableHead>
                <TableHead className="font-medium">Email</TableHead>
                <TableHead className="font-medium">Phone</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="font-medium">Date</TableHead>
                <TableHead className="w-[100px] font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id} className="group">
                  <TableCell className="font-medium text-foreground">
                    {request.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {request.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {request.phone}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      variant={request.status}
                      pulse={request.status === "verifying"}
                    >
                      {statusLabels[request.status]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(request.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {(request.status === "ready" || request.status === "action") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewReport(request)}
                          className="gap-1.5 text-primary hover:text-primary"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Resend Invite</DropdownMenuItem>
                          <DropdownMenuItem>Edit Details</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Cancel Request
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
