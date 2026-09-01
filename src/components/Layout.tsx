import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import Toaster from "./Toaster";
import ConfirmHost from "./ConfirmHost";
import { moduleForPath } from "../modules";

function buildCrumbs(pathname: string, search: string): string[] {
  const crumbs = ["Home"];
  const mod = moduleForPath(pathname);
  crumbs.push(mod.label);

  // Exact-match a nav entry for this page.
  const entry = mod.nav.find((e) => e.path === pathname);
  if (entry) {
    crumbs.push(entry.label);
    if (entry.kind === "section") {
      const tab = new URLSearchParams(search).get("tab");
      const sub = entry.items?.find((s) => s.tab === tab);
      if (sub) crumbs.push(sub.label);
    }
    return crumbs;
  }

  // Invoice / purchase sub-pages (no dedicated nav entry).
  if (/\/invoices\/new$/.test(pathname)) {
    crumbs.push("Invoices", "New");
  } else if (/\/invoices\/\d+\/edit$/.test(pathname)) {
    crumbs.push("Invoices", "Edit");
  } else if (/\/invoices\/\d+$/.test(pathname)) {
    crumbs.push("Invoices", "View");
  } else if (/\/purchases\/new$/.test(pathname)) {
    crumbs.push("Purchases", "New");
  } else if (/\/purchases\/\d+\/edit$/.test(pathname)) {
    crumbs.push("Purchases", "Edit");
  } else if (/\/purchases\/\d+$/.test(pathname)) {
    crumbs.push("Purchases", "View");
  }
  return crumbs;
}

export default function Layout() {
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "1"
  );
  const toggleCollapsed = () =>
    setSidebarCollapsed((v) => {
      localStorage.setItem("sidebarCollapsed", v ? "0" : "1");
      return !v;
    });

  const crumbs = buildCrumbs(location.pathname, location.search);

  // Full-bleed pages fill the whole main area (no width cap, no padding) and
  // manage their own scrolling. Everything else gets the padded, centered box.
  const fullBleed = /^\/invoicing\/whatsapp/.test(location.pathname);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar
        user={user}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <main
        className={`flex-1 flex flex-col min-w-0 h-screen transition-[margin] duration-200 ${
          sidebarCollapsed ? "lg:ml-[60px]" : "lg:ml-[230px]"
        }`}
      >
        <div className="shrink-0 z-20 bg-white border-b border-line px-4 sm:px-7 py-3.5 flex items-center gap-3">
          <button
            className="lg:hidden border border-line rounded-md p-1.5 text-ink"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={16} />
          </button>
          <div className="text-[12.5px] text-muted font-medium flex items-center gap-1.5">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-line">/</span>}
                <span className={i === crumbs.length - 1 ? "text-ink font-semibold" : ""}>
                  {c}
                </span>
              </span>
            ))}
          </div>
        </div>

        {fullBleed ? (
          <div className="flex-1 min-h-0 min-w-0">
            <Outlet context={{ user }} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-4 sm:px-7 pt-5 pb-16 max-w-[1280px] w-full">
              <Outlet context={{ user }} />
            </div>
          </div>
        )}
      </main>
      <Toaster />
      <ConfirmHost />
    </div>
  );
}
