import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/auth'

import { ProtectedRoute } from './components/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'

import { LoginPage } from './pages/LoginPage'
import { CallbackPage } from './pages/CallbackPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { DashboardPage } from './pages/DashboardPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { NewInvoicePage } from './pages/NewInvoicePage'
import { InvoiceDetailPage } from './pages/InvoiceDetailPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { DocumentDetailPage } from './pages/DocumentDetailPage'
import { TaxPage } from './pages/TaxPage'
import { SettingsPage } from './pages/SettingsPage'
import { CalendarPage } from './pages/CalendarPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

function App() {
  const initFromStorage = useAuthStore((s) => s.initFromStorage)

  useEffect(() => {
    initFromStorage()
  }, [initFromStorage])

  return (
    <Routes>
      {/* Public */}
      <Route path="/login"      element={<LoginPage />} />
      <Route path="/callback"   element={<CallbackPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />

      {/* Protected — all wrapped in the sidebar shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/"             element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/invoices"     element={<InvoicesPage />} />
          <Route path="/invoices/new" element={<NewInvoicePage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/tax"            element={<TaxPage />} />
          <Route path="/documents"      element={<DocumentsPage />} />
          <Route path="/documents/:id"  element={<DocumentDetailPage />} />
          <Route path="/payroll"      element={<PlaceholderPage title="Payroll"   phase="Phase 8" />} />
          <Route path="/calendar"       element={<CalendarPage />} />
          <Route path="/settings"       element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<LoginPage />} />
    </Routes>
  )
}

export default App
