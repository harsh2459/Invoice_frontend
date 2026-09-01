import {
  LayoutDashboard,
  PlusCircle,
  History,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  Building2,
  Contact,
  Package,
  FileText,
  Wallet,
  FileSpreadsheet,
  Landmark,
  MessageCircle,
  Truck,
  ShoppingCart,
  PackageSearch,
  UploadCloud,
  ShoppingBag,
  TrendingUp,
  Receipt,
  BookOpen,
  FileBarChart,
} from "lucide-react";

/**
 * Module registry. The app is organised into top-level modules (Cash Flow,
 * Invoicing, Reports); the active one is the first path segment. `Sidebar` and
 * `Layout` derive the nav and breadcrumb from this data instead of hardcoding.
 *
 * `path` values MUST be the exact `location.pathname` for that page (absolute,
 * module-prefixed, no trailing slash) — `Section` and the breadcrumb match on
 * strict equality.
 */

export interface NavSub {
  label: string;
  tab: string;
  adminOnly?: boolean;
}

export interface NavEntry {
  kind: "link" | "section";
  label: string;
  icon: React.ReactNode;
  path: string;
  adminOnly?: boolean;
  items?: NavSub[]; // when kind === "section"
  end?: boolean; // NavLink `end` prop for exact matching
}

export interface ModuleDef {
  key: string;
  label: string; // breadcrumb + switcher row
  short: string; // brand badge text
  icon: React.ReactNode; // switcher row icon
  basePath: string;
  nav: NavEntry[];
}

export const MODULES: ModuleDef[] = [
  {
    key: "cashflow",
    label: "Cash Flow",
    short: "CF",
    icon: <Wallet size={16} />,
    basePath: "/cashflow",
    nav: [
      {
        kind: "link",
        label: "Dashboard",
        icon: <LayoutDashboard size={16} />,
        path: "/cashflow",
        end: true,
      },
      {
        kind: "section",
        label: "New Entry",
        icon: <PlusCircle size={16} />,
        path: "/cashflow/entry",
        items: [
          { label: "Marketplace Payment", tab: "payment", adminOnly: true },
          { label: "Employee Sale", tab: "sale" },
          { label: "Expense", tab: "expense", adminOnly: true },
        ],
      },
      {
        kind: "section",
        label: "History",
        icon: <History size={16} />,
        path: "/cashflow/history",
        items: [
          { label: "Payments", tab: "payments", adminOnly: true },
          { label: "Sales", tab: "sales" },
          { label: "Expenses", tab: "expenses", adminOnly: true },
        ],
      },
      {
        kind: "link",
        label: "Team",
        icon: <Users size={16} />,
        path: "/cashflow/team",
        adminOnly: true,
      },
      {
        kind: "link",
        label: "Settings",
        icon: <SettingsIcon size={16} />,
        path: "/cashflow/settings",
        adminOnly: true,
      },
    ],
  },
  {
    key: "invoicing",
    label: "Invoicing",
    short: "IN",
    icon: <FileText size={16} />,
    basePath: "/invoicing",
    nav: [
      {
        kind: "link",
        label: "Invoices",
        icon: <FileText size={16} />,
        path: "/invoicing/invoices",
        adminOnly: true,
      },
      {
        kind: "link",
        label: "Purchases",
        icon: <ShoppingCart size={16} />,
        path: "/invoicing/purchases",
        adminOnly: true,
      },
      {
        kind: "link",
        label: "Companies",
        icon: <Building2 size={16} />,
        path: "/invoicing/companies",
        adminOnly: true,
      },
      {
        kind: "link",
        label: "Clients",
        icon: <Contact size={16} />,
        path: "/invoicing/clients",
        adminOnly: true,
      },
      {
        kind: "link",
        label: "Suppliers",
        icon: <Truck size={16} />,
        path: "/invoicing/suppliers",
        adminOnly: true,
      },
      {
        kind: "link",
        label: "Products",
        icon: <Package size={16} />,
        path: "/invoicing/products",
        adminOnly: true,
      },
      {
        kind: "link",
        label: "Banks",
        icon: <Landmark size={16} />,
        path: "/invoicing/banks",
        adminOnly: true,
      },
      {
        kind: "link",
        label: "WhatsApp",
        icon: <MessageCircle size={16} />,
        path: "/invoicing/whatsapp",
        adminOnly: true,
      },
    ],
  },
  {
    key: "collator",
    label: "Collator",
    short: "CO",
    icon: <PackageSearch size={16} />,
    basePath: "/collator",
    nav: [
      { kind: "link", label: "Dashboard", icon: <LayoutDashboard size={16} />, path: "/collator/dashboard", adminOnly: true },
      { kind: "link", label: "Import Files", icon: <UploadCloud size={16} />, path: "/collator/import", adminOnly: true },
      { kind: "link", label: "Import Logs", icon: <History size={16} />, path: "/collator/logs", adminOnly: true },
      { kind: "link", label: "Companies", icon: <Building2 size={16} />, path: "/collator/companies", adminOnly: true },
      { kind: "link", label: "Amazon", icon: <ShoppingBag size={16} />, path: "/collator/amazon", adminOnly: true },
      { kind: "link", label: "Flipkart", icon: <ShoppingBag size={16} />, path: "/collator/flipkart", adminOnly: true },
      { kind: "link", label: "Meesho", icon: <ShoppingBag size={16} />, path: "/collator/meesho", adminOnly: true },
      { kind: "link", label: "Fee Invoices", icon: <FileText size={16} />, path: "/collator/purchases", adminOnly: true },
      { kind: "link", label: "Bank", icon: <Landmark size={16} />, path: "/collator/bank", adminOnly: true },
      { kind: "link", label: "Ledgers", icon: <BookOpen size={16} />, path: "/collator/ledgers", adminOnly: true },
      { kind: "link", label: "Financial Statements", icon: <FileBarChart size={16} />, path: "/collator/statements", adminOnly: true },
      { kind: "link", label: "P&L Statement", icon: <TrendingUp size={16} />, path: "/collator/pnl", adminOnly: true },
      { kind: "link", label: "Tax & GST", icon: <Receipt size={16} />, path: "/collator/tax", adminOnly: true },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    short: "RP",
    icon: <BarChart3 size={16} />,
    basePath: "/reports",
    nav: [
      {
        kind: "link",
        label: "Overview",
        icon: <FileSpreadsheet size={16} />,
        path: "/reports/overview",
        adminOnly: true,
      },
      {
        kind: "link",
        label: "Employee Sales",
        icon: <BarChart3 size={16} />,
        path: "/reports",
        end: true,
        adminOnly: true,
      },
    ],
  },
];

export function moduleForPath(pathname: string): ModuleDef {
  return (
    MODULES.find(
      (m) => pathname === m.basePath || pathname.startsWith(m.basePath + "/")
    ) ?? MODULES[0]
  );
}

/** The modules a user of this role can see at least one nav entry in. */
export function visibleModules(isAdmin: boolean): ModuleDef[] {
  if (isAdmin) return MODULES;
  return MODULES.filter((m) =>
    m.nav.some((e) => {
      if (!e.adminOnly) {
        if (e.kind === "link") return true;
        return (e.items ?? []).some((s) => !s.adminOnly);
      }
      return false;
    })
  );
}
