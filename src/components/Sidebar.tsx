import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LogOut,
  ChevronRight,
  ChevronsUpDown,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  moduleForPath,
  visibleModules,
  type ModuleDef,
  type NavEntry,
  type NavSub,
} from "../modules";

const navLinkClass = (isActive: boolean, collapsed: boolean) =>
  `flex items-center gap-2.5 rounded-md text-[13px] font-medium transition-colors ${
    collapsed ? "px-0 py-2 justify-center" : "px-2.5 py-1.5"
  } ${isActive ? "bg-primary-soft text-primary" : "text-ink hover:bg-hover"}`;

function Section({
  entry,
  items,
  currentPath,
  currentTab,
  collapsed,
  onNavigate,
}: {
  entry: NavEntry;
  items: NavSub[];
  currentPath: string;
  currentTab: string | null;
  collapsed: boolean;
  onNavigate: (to: string) => void;
}) {
  const sectionActive = currentPath === entry.path;
  const [open, setOpen] = useState(sectionActive);

  if (collapsed) {
    // In the rail, a section just jumps to its first item.
    return (
      <button
        onClick={() => onNavigate(`${entry.path}?tab=${items[0]?.tab ?? ""}`)}
        title={entry.label}
        className={`w-full flex justify-center px-0 py-2 rounded-md text-[13px] transition-colors ${
          sectionActive ? "bg-primary-soft text-primary" : "text-ink hover:bg-hover"
        }`}
      >
        {entry.icon}
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
          sectionActive ? "bg-primary-soft text-primary" : "text-ink hover:bg-hover"
        }`}
      >
        {entry.icon}
        {entry.label}
        <ChevronRight
          size={14}
          className={`ml-auto opacity-60 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="pl-[29px] py-0.5 space-y-0.5">
          {items.map((it) => {
            const active = sectionActive && currentTab === it.tab;
            return (
              <button
                key={it.tab}
                onClick={() => onNavigate(`${entry.path}?tab=${it.tab}`)}
                className={`w-full text-left px-2.5 py-1.5 rounded-md text-[12.5px] font-medium transition-colors ${
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-muted hover:bg-hover hover:text-ink"
                }`}
              >
                {it.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkspaceSwitcher({
  activeModule,
  isAdmin,
  collapsed,
  onPick,
}: {
  activeModule: ModuleDef;
  isAdmin: boolean;
  collapsed: boolean;
  onPick: (m: ModuleDef) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const modules = visibleModules(isAdmin);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (collapsed) {
    return (
      <div className="p-2 border-b border-sidebar-border flex justify-center">
        <button
          onClick={() => modules.length >= 2 && setOpen((o) => !o)}
          title={activeModule.label}
          className="w-[34px] h-[34px] rounded-[7px] bg-primary text-white flex items-center justify-center font-bold text-sm"
        >
          {activeModule.short}
        </button>
        {open && (
          <div className="absolute left-[52px] top-2 z-30 w-48 rounded-md border border-line bg-white py-1 shadow-lg">
            {modules.map((m) => (
              <button
                key={m.key}
                onClick={() => {
                  setOpen(false);
                  onPick(m);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-hover ${
                  m.key === activeModule.key ? "text-primary font-semibold" : "text-ink"
                }`}
              >
                {m.icon}
                <span className="flex-1 text-left">{m.label}</span>
                {m.key === activeModule.key && <Check size={15} />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={modules.length < 2}
        className="w-full flex items-center gap-2.5 p-4 border-b border-sidebar-border hover:bg-hover transition-colors disabled:hover:bg-transparent disabled:cursor-default"
      >
        <div className="w-[30px] h-[30px] rounded-[7px] bg-primary text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
          {activeModule.short}
        </div>
        <div className="overflow-hidden leading-tight text-left flex-1">
          <div className="font-semibold text-[13.5px] text-ink truncate">{activeModule.label}</div>
          <div className="text-[11.5px] text-muted">
            {isAdmin ? "Owner Workspace" : "Employee Workspace"}
          </div>
        </div>
        {modules.length >= 2 && <ChevronsUpDown size={15} className="text-muted flex-shrink-0" />}
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-[calc(100%-6px)] z-30 rounded-md border border-line bg-white py-1 shadow-lg">
          {modules.map((m) => (
            <button
              key={m.key}
              onClick={() => {
                setOpen(false);
                onPick(m);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-hover ${
                m.key === activeModule.key ? "text-primary font-semibold" : "text-ink"
              }`}
            >
              {m.icon}
              <span className="flex-1 text-left">{m.label}</span>
              {m.key === activeModule.key && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  user,
  open,
  onClose,
  collapsed,
  onToggleCollapsed,
}: {
  user: any;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();
  const location = useLocation();
  const currentTab = new URLSearchParams(location.search).get("tab");
  const activeModule = moduleForPath(location.pathname);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const go = (to: string) => {
    navigate(to);
    onClose();
  };

  const pickModule = (m: ModuleDef) => {
    localStorage.setItem("lastModule", m.key);
    navigate(m.basePath);
    onClose();
  };

  const entries = activeModule.nav.filter((e) => !e.adminOnly || isAdmin);
  // On mobile the drawer is always full-width; collapse only applies on lg+.
  const railed = collapsed;

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/25 z-30 lg:hidden" onClick={onClose} />}
      <aside
        className={`flex-shrink-0 bg-sidebar-bg border-r border-sidebar-border flex flex-col fixed inset-y-0 left-0 z-40 transition-[transform,width] duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${railed ? "w-[60px]" : "w-[230px]"}`}
      >
        <WorkspaceSwitcher
          activeModule={activeModule}
          isAdmin={isAdmin}
          collapsed={railed}
          onPick={pickModule}
        />

        {/* collapse toggle — desktop only */}
        <button
          onClick={onToggleCollapsed}
          className="hidden lg:flex items-center justify-center gap-1.5 py-1.5 border-b border-sidebar-border text-muted hover:text-ink hover:bg-hover text-[11.5px] font-medium"
          title={railed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {railed ? <PanelLeftOpen size={15} /> : (
            <>
              <PanelLeftClose size={14} /> Collapse
            </>
          )}
        </button>

        <nav className={`flex-1 overflow-y-auto space-y-0.5 ${railed ? "p-1.5" : "p-2"}`}>
          {entries.map((entry) => {
            if (entry.kind === "section") {
              const items = (entry.items ?? []).filter((s) => !s.adminOnly || isAdmin);
              if (items.length === 0) return null;
              return (
                <Section
                  key={entry.path}
                  entry={entry}
                  items={items}
                  currentPath={location.pathname}
                  currentTab={currentTab}
                  collapsed={railed}
                  onNavigate={go}
                />
              );
            }
            return (
              <NavLink
                key={entry.path}
                to={entry.path}
                end={entry.end}
                onClick={onClose}
                title={railed ? entry.label : undefined}
                className={({ isActive }) => navLinkClass(isActive, railed)}
              >
                {entry.icon}
                {!railed && entry.label}
              </NavLink>
            );
          })}
        </nav>

        <div
          className={`border-t border-sidebar-border flex items-center gap-2.5 bg-white ${
            railed ? "p-2 justify-center" : "p-3"
          }`}
        >
          <div className="w-[26px] h-[26px] rounded-full bg-[#DCE7F5] text-[#3A5A80] font-semibold text-[12px] flex items-center justify-center flex-shrink-0 uppercase">
            {user?.name?.[0] || "U"}
          </div>
          {!railed && (
            <>
              <div className="flex-1 overflow-hidden">
                <div className="text-[12.5px] font-semibold truncate text-ink">{user?.name}</div>
                <div className="text-[11px] text-muted capitalize">{user?.role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-muted hover:text-negative hover:bg-negative-soft rounded-md transition-colors"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
        {railed && (
          <button
            onClick={handleLogout}
            className="lg:flex hidden items-center justify-center py-2 border-t border-sidebar-border text-muted hover:text-negative hover:bg-negative-soft"
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        )}
      </aside>
    </>
  );
}
