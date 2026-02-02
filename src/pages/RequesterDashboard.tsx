import { useState } from "react";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  Plus,
  Menu,
  X,
  Shield
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { RequestsTable } from "@/components/dashboard/RequestsTable";
import { NewRequestModal } from "@/components/dashboard/NewRequestModal";
import { ReportView } from "@/components/dashboard/ReportView";

type ViewState = "table" | "report";

export interface Request {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "pending" | "verifying" | "ready" | "action";
  createdAt: string;
  reportData?: {
    creditScore: { min: number; max: number };
    criminalCheck: "clear" | "alert";
    incomeVerification: "verified" | "unverified";
  };
}

const mockRequests: Request[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "(555) 123-4567",
    status: "ready",
    createdAt: "2024-01-15",
    reportData: {
      creditScore: { min: 720, max: 750 },
      criminalCheck: "clear",
      incomeVerification: "verified",
    },
  },
  {
    id: "2",
    name: "Michael Chen",
    email: "m.chen@email.com",
    phone: "(555) 234-5678",
    status: "verifying",
    createdAt: "2024-01-16",
  },
  {
    id: "3",
    name: "Emily Davis",
    email: "emily.d@email.com",
    phone: "(555) 345-6789",
    status: "pending",
    createdAt: "2024-01-17",
  },
  {
    id: "4",
    name: "James Wilson",
    email: "j.wilson@email.com",
    phone: "(555) 456-7890",
    status: "action",
    createdAt: "2024-01-14",
    reportData: {
      creditScore: { min: 580, max: 620 },
      criminalCheck: "alert",
      incomeVerification: "unverified",
    },
  },
];

const RequesterDashboard = () => {
  const [requests, setRequests] = useState<Request[]>(mockRequests);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewState, setViewState] = useState<ViewState>("table");
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [activeNav, setActiveNav] = useState("requests");

  const handleNewRequest = (data: { name: string; email: string; phone: string }) => {
    const newRequest: Request = {
      id: Date.now().toString(),
      ...data,
      status: "pending",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setRequests([newRequest, ...requests]);
    setIsModalOpen(false);
  };

  const handleViewReport = (request: Request) => {
    setSelectedRequest(request);
    setViewState("report");
  };

  const handleBackToTable = () => {
    setViewState("table");
    setSelectedRequest(null);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Sidebar */}
        <Sidebar className="border-r border-sidebar-border">
          <SidebarHeader className="border-b border-sidebar-border p-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-sidebar-foreground">VetMe</span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeNav === "dashboard"}
                  onClick={() => setActiveNav("dashboard")}
                  className="gap-3"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeNav === "requests"}
                  onClick={() => {
                    setActiveNav("requests");
                    setViewState("table");
                    setSelectedRequest(null);
                  }}
                  className="gap-3"
                >
                  <Users className="h-4 w-4" />
                  Active Requests
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeNav === "reports"}
                  onClick={() => setActiveNav("reports")}
                  className="gap-3"
                >
                  <FileText className="h-4 w-4" />
                  Reports
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeNav === "settings"}
                  onClick={() => setActiveNav("settings")}
                  className="gap-3"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          {/* Top Bar */}
          <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="lg:hidden">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <h1 className="text-lg font-semibold text-foreground">
                {viewState === "report" && selectedRequest
                  ? `Report: ${selectedRequest.name}`
                  : "Active Requests"}
              </h1>
            </div>
            {viewState === "table" && (
              <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                New Request
              </Button>
            )}
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-auto bg-background p-4 lg:p-6">
            {viewState === "table" ? (
              <RequestsTable
                requests={requests}
                onViewReport={handleViewReport}
              />
            ) : (
              selectedRequest && (
                <ReportView
                  request={selectedRequest}
                  onBack={handleBackToTable}
                />
              )
            )}
          </main>
        </div>
      </div>

      <NewRequestModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleNewRequest}
      />
    </SidebarProvider>
  );
};

export default RequesterDashboard;
