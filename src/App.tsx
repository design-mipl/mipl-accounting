import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import CustomersPage from './pages/customers/CustomersPage'
import VendorsPage from './pages/vendors/VendorsPage'
import MonthlyPaymentRegister from './pages/payments/MonthlyPaymentRegister'
import ProjectsPage from './pages/sales/ProjectsPage'
import AMCTrackerPage from './pages/sales/AMCTrackerPage'
import ProformaInvoicesPage from './pages/sales/ProformaInvoicesPage'
import TaxInvoicesPage from './pages/sales/TaxInvoicesPage'
import BillingTrackerPage from './pages/sales/BillingTrackerPage'
import PlaceholderPage from './pages/PlaceholderPage'
import { SalesProvider } from './contexts/SalesContext'
import { CustomerProvider } from './contexts/CustomerContext'

export default function App() {
  return (
    <CustomerProvider>
      <SalesProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/customers" replace />} />
            <Route path="customers" element={<CustomersPage />} />

            <Route path="sales" element={<Navigate to="/sales/projects" replace />} />
            <Route path="sales/projects" element={<ProjectsPage />} />
            <Route path="sales/amc" element={<AMCTrackerPage />} />
            <Route path="sales/proforma" element={<ProformaInvoicesPage />} />
            <Route path="sales/tax-invoices" element={<TaxInvoicesPage />} />
            <Route path="sales/billing" element={<BillingTrackerPage />} />

            <Route path="expenses" element={<PlaceholderPage title="Expenses" />} />
            <Route path="expenses/monthly-payment" element={<MonthlyPaymentRegister />} />

            <Route path="vendors" element={<VendorsPage />} />
            <Route path="settings" element={<PlaceholderPage title="Settings" />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </SalesProvider>
    </CustomerProvider>
  )
}
