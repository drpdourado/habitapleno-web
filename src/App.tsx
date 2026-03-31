import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

// === Providers & Contexts ===
import { AppProvider, useApp } from './contexts/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';

// === UI Components ===
import { CondoSelector } from './components/CondoSelector';
import { PrivateRoute } from './components/PrivateRoute';
import { ModuleRoute } from './components/ModuleRoute';

// === Pages ===
import DashboardPage from './pages/DashboardPage';
import UnitsPage from './pages/UnitsPage';
import SettingsPage from './pages/SettingsPage';
import HistoryPage from './pages/HistoryPage';
import HistoryDetailsPage from './pages/HistoryDetailsPage';
import { ReadingsManagerPage } from './pages/ReadingsManagerPage';
import { FinancialPage } from './pages/FinancialPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import UsersPage from './pages/UsersPage';
import MobileReading from './pages/MobileReading';
import { CategoriesPage } from './pages/CategoriesPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ReconciliationPage } from './pages/ReconciliationPage';
import ImprovementsPage from './pages/ImprovementsPage';
import { CondosPage } from './pages/CondosPage';
import RegisterPage from './pages/RegisterPage';
import ProfilesPage from './pages/ProfilesPage';
import { MuralPage } from './pages/MuralPage';
import PollsPage from './pages/Polls/PollsPage';
import { AccessControlPage } from './pages/AccessControlPage';
import { ConciergePage } from './pages/ConciergePage';
import { OcorrenciasPage } from './pages/OcorrenciasPage';
import { ManutencoesPage } from './pages/ManutencoesPage';
import { MonthClosurePage } from './pages/MonthClosurePage';
import { ReportsPage } from './pages/ReportsPage';
import { AreasAdminPage } from './pages/AreasAdminPage';
import { BookingPage } from './pages/BookingPage';
import BankAccountsPage from './pages/BankAccountsPage';
import NotificationsPage from './pages/NotificationsPage';
import ContactPage from './pages/ContactPage';
import { CondoPlansPage } from './pages/CondoPlansPage';
import DesignSystemPage from './pages/DesignSystemPage';


function AppContent() {
  const { isLoading: isDataLoading, error, tenantId } = useApp();
  const { user, loading: isAuthLoading, isSuperAdmin, isSelectingCondo } = useAuth();

  // Se estiver verificando login OU carregando dados críticos, mostra loader
  const isPendingTenant = user && tenantId === "";
  const [showTimeoutError, setShowTimeoutError] = useState(false);

  const isStillLoading = isAuthLoading || (user && isDataLoading) || isPendingTenant;

  useEffect(() => {
    if (!isStillLoading) {
      setShowTimeoutError(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowTimeoutError(true);
    }, 10000); // 10 seconds
    return () => clearTimeout(timer);
  }, [isStillLoading]);

  if (error) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center p-6 text-center z-[100]">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 text-xl font-bold">
           ⚠️
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Conexão Falhou</h2>
        <p className="text-slate-600 max-w-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (isSelectingCondo) {
    return <CondoSelector />;
  }

  if (isStillLoading) {
    const loaderMessage = isAuthLoading
      ? "Autenticando..."
      : "Sincronizando ambiente...";

    return (
       <LoginPage 
         isLoading={true} 
         loaderMessage={loaderMessage} 
         showRetry={showTimeoutError}
         onRetry={() => window.location.reload()}
       />
    );
  }


  return (
    <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/registrar"
          element={user ? <Navigate to="/" replace /> : <RegisterPage />}
        />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/mobile-reading" element={
                    <ModuleRoute module="gas" level="own">
                      <MobileReading />
                    </ModuleRoute>
                  } />
                  <Route path="/units" element={
                    <ModuleRoute module="units" level="own">
                      <UnitsPage />
                    </ModuleRoute>
                  } />
                  <Route path="/history" element={
                    <ModuleRoute module="history" level="own">
                      <HistoryPage />
                    </ModuleRoute>
                  } />
                  <Route path="/history/:id" element={
                    <ModuleRoute module="history" level="own">
                      <HistoryDetailsPage />
                    </ModuleRoute>
                  } />
                  <Route path="/settings" element={
                    <ModuleRoute module="settings" level="all">
                      <SettingsPage />
                    </ModuleRoute>
                  } />
                  <Route path="/readings" element={
                    <ModuleRoute module="gas" level="own">
                      <ReadingsManagerPage />
                    </ModuleRoute>
                  } />
                  <Route path="/financial" element={
                    <ModuleRoute module="financial" level="own">
                      <FinancialPage />
                    </ModuleRoute>
                  } />
                  <Route path="/bank-accounts" element={
                    <ModuleRoute module="bank_accounts" level="all">
                      <BankAccountsPage />
                    </ModuleRoute>
                  } />
                  <Route path="/financial/encerramento" element={
                    <ModuleRoute module="closures" level="all">
                      <MonthClosurePage />
                    </ModuleRoute>
                  } />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/users" element={
                    <ModuleRoute module="users" level="all">
                      <UsersPage />
                    </ModuleRoute>
                  } />
                  <Route path="/categories" element={
                    <ModuleRoute module="categories" level="own">
                      <CategoriesPage />
                    </ModuleRoute>
                  } />
                  <Route path="/profiles" element={
                    <ModuleRoute module="profiles" level="all">
                      <ProfilesPage />
                    </ModuleRoute>
                  } />
                  <Route path="/documents" element={
                    <ModuleRoute module="documents" level="own">
                      <DocumentsPage />
                    </ModuleRoute>
                  } />
                  <Route path="/reconciliation" element={
                    <ModuleRoute module="reconciliation" level="own">
                      <ReconciliationPage />
                    </ModuleRoute>
                  } />
                  <Route path="/improvements" element={
                    <ModuleRoute module="improvements" level="own">
                      <ImprovementsPage />
                    </ModuleRoute>
                  } />
                  <Route path="/mural" element={
                    <ModuleRoute module="mural" level="own">
                      <MuralPage />
                    </ModuleRoute>
                  } />
                  <Route path="/polls" element={
                    <ModuleRoute module="polls" level="own">
                      <PollsPage />
                    </ModuleRoute>
                  } />
                  <Route path="/access-control" element={
                    <ModuleRoute module="access" level="own">
                      <AccessControlPage />
                    </ModuleRoute>
                  } />
                  <Route path="/concierge" element={
                    <ModuleRoute module="access" level="all">
                      <ConciergePage />
                    </ModuleRoute>
                  } />
                  <Route path="/ocorrencias" element={
                    <ModuleRoute module="ocorrencias" level="own">
                      <OcorrenciasPage />
                    </ModuleRoute>
                  } />
                  <Route path="/manutencoes" element={
                    <ModuleRoute module="manutencoes" level="all">
                      <ManutencoesPage />
                    </ModuleRoute>
                  } />
                  <Route path="/reports" element={
                    <ModuleRoute module="reports" level="all">
                      <ReportsPage />
                    </ModuleRoute>
                  } />
                  <Route path="/reservas/areas" element={
                    <ModuleRoute module="areas" level="all">
                      <AreasAdminPage />
                    </ModuleRoute>
                  } />
                  <Route path="/reservas" element={
                    <ModuleRoute module="areas" level="own">
                      <BookingPage />
                    </ModuleRoute>
                  } />
                  <Route path="/fale-conosco" element={
                    <ModuleRoute module="contact" level="own">
                      <ContactPage />
                    </ModuleRoute>
                  } />
                  <Route path="/condos" element={
                    isSuperAdmin ? <CondosPage /> : <Navigate to="/" replace />
                  } />
                  <Route path="/planos" element={
                    isSuperAdmin ? <CondoPlansPage /> : <Navigate to="/" replace />
                  } />
                  <Route path="/notificacoes" element={<NotificationsPage />} />
                  <Route path="/design-system" element={<DesignSystemPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
  );
}

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AppProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
