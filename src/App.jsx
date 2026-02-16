import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PageShell from './components/layout/PageShell';
import { I18nProvider } from './i18n/I18nContext';

// Lazy Load Pages for Performance
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage'));
const OffersPage = lazy(() => import('./pages/OffersPage'));
const OfferWizardPage = lazy(() => import('./pages/OfferWizardPage'));
const OfferPreviewPage = lazy(() => import('./pages/OfferPreviewPage'));
const OfferPublicPage = lazy(() => import('./pages/OfferPublicPage'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const PublicReviewPage = lazy(() => import('./pages/PublicReviewPage'));
const TrashPage = lazy(() => import('./pages/TrashPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));

// Loading Fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen text-[var(--text-muted)] font-medium">
    Loading application...
  </div>
);

function App() {
  // Global environment check for debug tools
  React.useEffect(() => {
    const isDev = import.meta.env.DEV;
    if (!isDev) {
      document.body.classList.add('env-production');
    } else {
      document.body.classList.add('env-development');
    }
  }, []);

  return (
    <I18nProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/review/:token" element={<PublicReviewPage />} />

            {/* App Routes */}
            <Route path="/" element={<PageShell />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />
              <Route path="offers" element={<OffersPage />} />
              <Route path="offers/:id" element={<OfferPreviewPage />} />
              <Route path="offer/new" element={<OfferWizardPage />} />
              <Route path="offer/edit/:editId" element={<OfferWizardPage />} />
              <Route path="offer/wizard" element={<OfferWizardPage />} />
              <Route path="offer/preview/:id" element={<OfferPreviewPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectDetailPage />} />
              <Route path="reviews" element={<ReviewsPage />} />
              <Route path="reviews/:token" element={<ReviewPage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="trash" element={<TrashPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/audit" element={<AuditPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </I18nProvider >
  );
}

export default App;
