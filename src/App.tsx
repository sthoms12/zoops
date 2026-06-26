import { BrowserRouter, Route, Routes, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Search, Server,
  Brain, Activity, Settings as SettingsIcon, Zap, Menu, X,
  Rss, Terminal, Database, GitCompare, Globe, Calendar as CalendarIcon,
} from "lucide-react";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import ErrorBoundary from "@/components/ErrorBoundary";

import CommandCenter from "@/pages/CommandCenter";
import DiscoveryPage from "@/pages/Discovery";
import ServicesPage from "@/pages/Services";
import SitesPage from "@/pages/Sites";
import SkillsPersonas from "@/pages/SkillsPersonas";
import HealthPage from "@/pages/Health";
import SettingsPage from "@/pages/Settings";
import AutomationsPage from "@/pages/Automations";
import AutomationCalendarPage from "@/pages/AutomationCalendar";
import AutomationDetail from "@/pages/AutomationDetail";
import FeedPage from "@/pages/Feed";
import LogsPage from "@/pages/Logs";
import ExplorerPage from "@/pages/Explorer";
import ChangelogPage from "@/pages/Changelog";

type NavGroup = {
  label: string;
  items: NavItem[];
};

type NavItem = {
  to: string;
  icon: React.ReactNode;
  label: string;
  badgeKey?: string;
  exact?: boolean;
};

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/", icon: <LayoutDashboard size={15} />, label: "Command Center", exact: true },
      { to: "/discovery", icon: <Search size={15} />, label: "Discovery" },
      { to: "/changelog", icon: <GitCompare size={15} />, label: "Workspace Changelog" },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/feed", icon: <Rss size={15} />, label: "Intelligence Feed" },
      { to: "/sites", icon: <Globe size={15} />, label: "Sites & Services" },
      { to: "/services", icon: <Server size={15} />, label: "Services" },
      { to: "/automations", icon: <Zap size={15} />, label: "Automations" },
      { to: "/calendar", icon: <CalendarIcon size={15} />, label: "Schedule" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/skills-personas", icon: <Brain size={15} />, label: "Skills & Personas" },
      { to: "/health", icon: <Activity size={15} />, label: "Health" },
      { to: "/logs", icon: <Terminal size={15} />, label: "Logs" },
      { to: "/explorer", icon: <Database size={15} />, label: "DB Explorer" },
      { to: "/settings", icon: <SettingsIcon size={15} />, label: "Settings" },
    ],
  },
];

function AppShell() {
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [healthStatus, setHealthStatus] = useState<string>("unknown");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { fetchDashboard(); }, []);
  useEffect(() => {
    const id = setInterval(fetchDashboard, 60000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  async function fetchDashboard() {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        setBadges({});
        setHealthStatus(data.latestHealth?.overall_status ?? "unknown");
      }
    } catch {}
  }

  function isActive(item: NavItem) {
    if (item.exact) return location.pathname === item.to;
    return location.pathname === item.to || location.pathname.startsWith(item.to + "/");
  }

  const healthDot: Record<string, string> = {
    healthy: "bg-emerald-400",
    warning: "bg-yellow-400",
    failed: "bg-red-400",
    unknown: "bg-zinc-500",
  };

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Logo / header row */}
      <div
        className={cn(
          "flex items-center border-b h-12 shrink-0",
          isMobile ? "px-4 gap-2.5 justify-between" : collapsed ? "px-3 justify-center" : "px-4 gap-2.5"
        )}
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <button
          onClick={() => !isMobile && setCollapsed(!collapsed)}
          className="flex items-center gap-2"
        >
          <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center shrink-0">
            <Zap size={13} className="text-primary" />
          </div>
          {(isMobile || !collapsed) && (
            <span className="font-semibold text-sm tracking-tight">ZoOps</span>
          )}
        </button>
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4 px-2">
        {navGroups.map(group => (
          <div key={group.label}>
            {(isMobile || !collapsed) && (
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = isActive(item);
                const badge = item.badgeKey ? badges[item.badgeKey] : undefined;
                return (
                  <Link key={item.to} to={item.to}
                    className={cn(
                      "flex items-center rounded-md text-sm transition-colors",
                      !isMobile && collapsed ? "px-2 py-2 justify-center" : "px-2 py-1.5 gap-2.5",
                      active
                        ? "bg-primary/15 text-foreground"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                    title={!isMobile && collapsed ? item.label : undefined}
                  >
                    <span className={cn("shrink-0", active ? "text-primary" : "")}>{item.icon}</span>
                    {(isMobile || !collapsed) && (
                      <>
                        <span className="flex-1 leading-none">{item.label}</span>
                        {badge !== undefined && badge > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 leading-none">{badge > 99 ? "99+" : badge}</span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {(isMobile || !collapsed) && (
        <div className="p-3 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="flex items-center gap-2 px-2">
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", healthDot[healthStatus] || "bg-zinc-500")} />
            <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              Zo Computer — {healthStatus === "unknown" ? "checking..." : healthStatus}
            </span>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)", color: "var(--foreground)" }}>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col w-[240px] border-r transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "var(--sidebar)", borderColor: "var(--sidebar-border)" }}
      >
        {sidebarContent(true)}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col shrink-0 border-r transition-all duration-200",
          collapsed ? "w-[52px]" : "w-[216px]"
        )}
        style={{ background: "var(--sidebar)", borderColor: "var(--sidebar-border)" }}
      >
        {sidebarContent(false)}
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center h-12 px-4 gap-3 border-b md:hidden shrink-0" style={{ borderColor: "var(--sidebar-border)", background: "var(--sidebar)" }}>
          <button onClick={() => setMobileOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
              <Zap size={11} className="text-primary" />
            </div>
            <span className="font-semibold text-sm tracking-tight">ZoOps</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className={cn("w-1.5 h-1.5 rounded-full", healthDot[healthStatus] || "bg-zinc-500")} />
            <span className="text-[11px] text-muted-foreground">{healthStatus === "unknown" ? "checking..." : healthStatus}</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<ErrorBoundary label="Command Center"><CommandCenter onRefresh={fetchDashboard} /></ErrorBoundary>} />
            <Route path="/discovery" element={<ErrorBoundary label="Discovery"><DiscoveryPage /></ErrorBoundary>} />
            <Route path="/services" element={<ErrorBoundary label="Services"><ServicesPage /></ErrorBoundary>} />
            <Route path="/sites" element={<ErrorBoundary label="Live Sites"><SitesPage /></ErrorBoundary>} />
            <Route path="/automations" element={<ErrorBoundary label="Automations"><AutomationsPage /></ErrorBoundary>} />
            <Route path="/automations/:id" element={<ErrorBoundary label="Automation Detail"><AutomationDetail /></ErrorBoundary>} />
            <Route path="/calendar" element={<ErrorBoundary label="Schedule"><AutomationCalendarPage /></ErrorBoundary>} />
            <Route path="/feed" element={<ErrorBoundary label="Intelligence Feed"><FeedPage /></ErrorBoundary>} />
            <Route path="/logs" element={<ErrorBoundary label="Logs"><LogsPage /></ErrorBoundary>} />
            <Route path="/explorer" element={<ErrorBoundary label="DB Explorer"><ExplorerPage /></ErrorBoundary>} />
            <Route path="/changelog" element={<ErrorBoundary label="Workspace Changelog"><ChangelogPage /></ErrorBoundary>} />
            <Route path="/skills-personas" element={<ErrorBoundary label="Skills & Personas"><SkillsPersonas /></ErrorBoundary>} />
            <Route path="/health" element={<ErrorBoundary label="Health"><HealthPage /></ErrorBoundary>} />
            <Route path="/settings" element={<ErrorBoundary label="Settings"><SettingsPage /></ErrorBoundary>} />
          </Routes>
        </div>
      </main>

      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
