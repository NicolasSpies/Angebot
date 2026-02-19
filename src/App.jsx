import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PageShell from './components/layout/PageShell';
import { I18nProvider } from './i18n/I18nContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ui/ErrorBoundary';
import logger from './utils/logger';
import { dataService } from './data/dataService';

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
const SupportPage = lazy(() => import('./pages/SupportPage'));
const TrashPage = lazy(() => import('./pages/TrashPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const PortalsOverviewPage = lazy(() => import('./pages/PortalsOverviewPage'));
const PortalLayout = lazy(() => import('./components/layout/PortalLayout'));
const PortalDashboard = lazy(() => import('./pages/portal/PortalDashboard'));
const PortalProjectsPage = lazy(() => import('./pages/portal/PortalProjectsPage'));
const PortalProjectDetailPage = lazy(() => import('./pages/portal/PortalProjectDetailPage'));
const PortalReviewsPage = lazy(() => import('./pages/portal/PortalReviewsPage'));

const PortalNotificationsPage = lazy(() => import('./pages/portal/PortalNotificationsPage'));

// Loading Fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen text-[var(--text-muted)] font-medium">
    Loading application...
  </div>
);

function App() {
  // Global bootstrap sequence (non-blocking)
  React.useEffect(() => {
    const isDev = import.meta.env.DEV;
    logger.info('APP', `Application initializing in ${isDev ? 'development' : 'production'} mode`);

    if (!isDev) {
      document.body.classList.add('env-production');
    } else {
      document.body.classList.add('env-development');
    }

    // Background health check
    dataService.getDashboardStats().catch(() => { });
  }, []);

  return (
    <I18nProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/healthz" element="ok" />
            <Route path="/review/:token" element={<PublicReviewPage />} />
            <Route path="/offer/sign/:token" element={<OfferPublicPage />} />

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
              <Route path="support" element={<SupportPage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="trash" element={<TrashPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/audit" element={<AuditPage />} />
              <Route path="portals" element={<PortalsOverviewPage />} />
            </Route>

            {/* Portal Routes */}
            <Route path="/portal/preview/:customerId" element={<PortalLayout />}>
              <Route index element={<PortalDashboard />} />
              <Route path="projects" element={<PortalProjectsPage />} />
              <Route path="projects/:projectId" element={<PortalProjectDetailPage />} />
              <Route path="reviews" element={<PortalReviewsPage />} />
              <Route path="/portal/preview/:customerId/reviews/:token" element={<PublicReviewPage />} />
              <Route path="notifications" element={<PortalNotificationsPage />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </I18nProvider>
  );
}

export default App;
