import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import ServicesPage from './pages/ServicesPage';
import OffersPage from './pages/OffersPage';
import OfferWizardPage from './pages/OfferWizardPage';
import OfferPreviewPage from './pages/OfferPreviewPage';
import PublicOfferPage from './pages/PublicOfferPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import SettingsPage from './pages/SettingsPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailView from './pages/ProjectDetailPage';
import { I18nProvider } from './i18n/I18nContext';

function App() {
  return (
    <I18nProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="offers" element={<OffersPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectDetailView />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="offer/new" element={<OfferWizardPage />} />
            <Route path="offer/edit/:editId" element={<OfferWizardPage />} />
            <Route path="offer/preview/:id" element={<OfferPreviewPage />} />
          </Route>
          <Route path="offer/sign/:id" element={<PublicOfferPage />} />
        </Routes>
      </Router>
    </I18nProvider>
  );
}

export default App;
