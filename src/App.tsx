import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import EntryForm from "./components/EntryForm";
import HistoryTable from "./components/HistoryTable";
import TeamManagement from "./components/TeamManagement";
import Settings from "./components/Settings";
import Reports from "./components/Reports";
import ReportsOverview from "./components/ReportsOverview";
import Companies from "./components/invoicing/Companies";
import Clients from "./components/invoicing/Clients";
import ClientView from "./components/invoicing/ClientView";
import Products from "./components/invoicing/Products";
import DocumentsList from "./components/invoicing/DocumentsList";
import ReceiptView from "./components/invoicing/ReceiptView";
import ReturnView from "./components/invoicing/ReturnView";
import InvoicingPnL from "./components/invoicing/InvoicingPnL";
import { IndianRupee, Undo2, FileBarChart } from "lucide-react";
import InvoiceForm from "./components/invoicing/InvoiceForm";
import NewDocument from "./components/invoicing/NewDocument";
import InvoiceView from "./components/invoicing/InvoiceView";
import BankAccounts from "./components/invoicing/BankAccounts";
import WhatsAppConnect from "./components/invoicing/WhatsAppConnect";
import Suppliers from "./components/invoicing/Suppliers";
import Purchases from "./components/invoicing/Purchases";
import PurchaseForm from "./components/invoicing/PurchaseForm";
import PurchaseView from "./components/invoicing/PurchaseView";
import CollatorDashboard from "./components/collator/Dashboard";
import CollatorImport from "./components/collator/Import";
import CollatorImportLogs from "./components/collator/ImportLogs";
import CollatorCompanies from "./components/collator/Companies";
import MarketplaceData from "./components/collator/MarketplaceData";
import CollatorPnL from "./components/collator/PnLPage";
import CollatorTax from "./components/collator/TaxDashboard";
import CollatorPurchases from "./components/collator/PurchaseData";
import CollatorBank from "./components/collator/BankData";
import CollatorLedgers from "./components/collator/LedgerManager";
import CollatorStatements from "./components/collator/FinancialStatements";

function PrivateRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);
  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function HomeRedirect() {
  const last = localStorage.getItem("lastModule");
  const target = last === "invoicing" ? "/invoicing" : last === "reports" ? "/reports" : "/cashflow";
  return <Navigate to={target} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<HomeRedirect />} />

          {/* Cash Flow module */}
          <Route path="cashflow" element={<Dashboard />} />
          <Route path="cashflow/entry" element={<EntryForm />} />
          <Route path="cashflow/history" element={<HistoryTable />} />
          <Route path="cashflow/team" element={<PrivateRoute adminOnly><TeamManagement /></PrivateRoute>} />
          <Route path="cashflow/settings" element={<PrivateRoute adminOnly><Settings /></PrivateRoute>} />

          {/* Invoicing module */}
          <Route path="invoicing" element={<Navigate to="/invoicing/invoices" replace />} />
          <Route path="invoicing/invoices" element={<PrivateRoute adminOnly><DocumentsList only="sales" title="Sales Invoices" /></PrivateRoute>} />
          <Route path="invoicing/payments" element={<PrivateRoute adminOnly><DocumentsList only="receipt" title="Payments Received" icon={<IndianRupee size={20} className="text-positive" />} /></PrivateRoute>} />
          <Route path="invoicing/returns" element={<PrivateRoute adminOnly><DocumentsList only="return" title="Sales Returns" icon={<Undo2 size={20} className="text-amazon-text" />} /></PrivateRoute>} />
          <Route path="invoicing/returns/:id" element={<PrivateRoute adminOnly><ReturnView /></PrivateRoute>} />
          <Route path="invoicing/clients/:clientId/receipts/:rid" element={<PrivateRoute adminOnly><ReceiptView /></PrivateRoute>} />
          <Route path="invoicing/reports" element={<PrivateRoute adminOnly><DocumentsList title="All Documents" icon={<FileBarChart size={20} className="text-primary" />} /></PrivateRoute>} />
          <Route path="invoicing/pnl" element={<PrivateRoute adminOnly><InvoicingPnL /></PrivateRoute>} />
          <Route path="invoicing/invoices/new" element={<PrivateRoute adminOnly><NewDocument /></PrivateRoute>} />
          <Route path="invoicing/invoices/:id/edit" element={<PrivateRoute adminOnly><InvoiceForm /></PrivateRoute>} />
          <Route path="invoicing/invoices/:id" element={<PrivateRoute adminOnly><InvoiceView /></PrivateRoute>} />
          <Route path="invoicing/companies" element={<PrivateRoute adminOnly><Companies /></PrivateRoute>} />
          <Route path="invoicing/clients" element={<PrivateRoute adminOnly><Clients /></PrivateRoute>} />
          <Route path="invoicing/clients/:id" element={<PrivateRoute adminOnly><ClientView /></PrivateRoute>} />
          <Route path="invoicing/products" element={<PrivateRoute adminOnly><Products /></PrivateRoute>} />
          <Route path="invoicing/banks" element={<PrivateRoute adminOnly><BankAccounts /></PrivateRoute>} />
          <Route path="invoicing/suppliers" element={<PrivateRoute adminOnly><Suppliers /></PrivateRoute>} />
          <Route path="invoicing/purchases" element={<PrivateRoute adminOnly><Purchases /></PrivateRoute>} />
          <Route path="invoicing/purchases/new" element={<PrivateRoute adminOnly><PurchaseForm /></PrivateRoute>} />
          <Route path="invoicing/purchases/:id/edit" element={<PrivateRoute adminOnly><PurchaseForm /></PrivateRoute>} />
          <Route path="invoicing/purchases/:id" element={<PrivateRoute adminOnly><PurchaseView /></PrivateRoute>} />
          <Route path="invoicing/whatsapp" element={<PrivateRoute adminOnly><WhatsAppConnect /></PrivateRoute>} />

          {/* Collator module (marketplace ingestion) */}
          <Route path="collator" element={<Navigate to="/collator/dashboard" replace />} />
          <Route path="collator/dashboard" element={<PrivateRoute adminOnly><CollatorDashboard /></PrivateRoute>} />
          <Route path="collator/import" element={<PrivateRoute adminOnly><CollatorImport /></PrivateRoute>} />
          <Route path="collator/logs" element={<PrivateRoute adminOnly><CollatorImportLogs /></PrivateRoute>} />
          <Route path="collator/companies" element={<PrivateRoute adminOnly><CollatorCompanies /></PrivateRoute>} />
          <Route path="collator/amazon" element={<PrivateRoute adminOnly><MarketplaceData platform="amazon" /></PrivateRoute>} />
          <Route path="collator/flipkart" element={<PrivateRoute adminOnly><MarketplaceData platform="flipkart" /></PrivateRoute>} />
          <Route path="collator/meesho" element={<PrivateRoute adminOnly><MarketplaceData platform="meesho" /></PrivateRoute>} />
          <Route path="collator/purchases" element={<PrivateRoute adminOnly><CollatorPurchases /></PrivateRoute>} />
          <Route path="collator/bank" element={<PrivateRoute adminOnly><CollatorBank /></PrivateRoute>} />
          <Route path="collator/ledgers" element={<PrivateRoute adminOnly><CollatorLedgers /></PrivateRoute>} />
          <Route path="collator/statements" element={<PrivateRoute adminOnly><CollatorStatements /></PrivateRoute>} />
          <Route path="collator/pnl" element={<PrivateRoute adminOnly><CollatorPnL /></PrivateRoute>} />
          <Route path="collator/tax" element={<PrivateRoute adminOnly><CollatorTax /></PrivateRoute>} />

          {/* Reports module */}
          <Route path="reports" element={<PrivateRoute adminOnly><Reports /></PrivateRoute>} />
          <Route path="reports/overview" element={<PrivateRoute adminOnly><ReportsOverview /></PrivateRoute>} />

          {/* Legacy path redirects (one release) */}
          <Route path="entry" element={<Navigate to="/cashflow/entry" replace />} />
          <Route path="history" element={<Navigate to="/cashflow/history" replace />} />
          <Route path="team" element={<Navigate to="/cashflow/team" replace />} />
          <Route path="settings" element={<Navigate to="/cashflow/settings" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
