import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { StockProvider } from '@/contexts/StockContext';
import { ProtectedRoute } from '@/components/features/auth/ProtectedRoute';
import { AuthErrorBoundary } from '@/components/features/auth/AuthErrorBoundary';
import { useSidebarStore } from '@/store/sidebarStore';
import { Sidebar } from '@/components/shared/layout/Sidebar';
import { StockSidebar } from '@/components/features/stock/StockSidebar';
import { GlobalFilters } from '@/components/shared/layout/GlobalFilters';
import { Dashboard } from '@/pages/dashboard/Dashboard';
import { Suppliers } from '@/pages/suppliers/Suppliers';
import { Products } from '@/pages/products/Products';
import { ProductDetail } from '@/pages/products/ProductDetail';
import { ProductCategories } from '@/pages/products/ProductCategories';
import { PriceAlerts } from '@/pages/alerts/PriceAlerts';
import { PriceNegotiations } from '@/pages/priceNegotiations/PriceNegotiations';
import { Pax } from '@/pages/analytics/Pax';
import { ImportData } from '@/pages/import/ImportData';
import { Settings } from '@/pages/settings';
import { Help } from '@/pages/help/Help';
import { Documents } from '@/pages/documents/Documents';
import { DocumentDetail } from '@/pages/documents/DocumentDetail';
import { Efficiency } from '@/pages/analytics/Efficiency';
import { CogsDashboard } from '@/pages/analytics/CogsDashboard';
import { LocationsPage } from '@/pages/management/Locations';
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage';
import { EmailVerificationPage } from '@/components/features/auth/EmailVerificationPage';
import { ProductTargets } from '@/pages/products/ProductTargets';
import { ProductEfficiency } from '@/pages/products/ProductEfficiency';
import { CasesOfConcern } from '@/pages/cases/CasesOfConcern';

// Stock Management Pages
import { StockDashboard } from '@/pages/stock/StockDashboard';
import { StockItems } from '@/pages/stock/StockItems';
import { StockCounts } from '@/pages/stock/StockCounts';
import { DeliveryRecords } from '@/pages/stock/DeliveryRecords';
import { StockUnits } from '@/pages/stock/StockUnits';
import { StockReports } from '@/pages/stock/StockReports';

// Universe type
type Universe = 'procurement' | 'stock';

function App() {
  const { isCollapsed } = useSidebarStore();
  const [universe, setUniverse] = useState<Universe>('procurement');
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  const handleSwitchToStock = () => {
    setUniverse('stock');
    setRedirectPath('/stock');
    setTimeout(() => setRedirectPath(null), 0);
  };

  const handleSwitchToProcurement = () => {
    setUniverse('procurement');
    setRedirectPath('/');
    setTimeout(() => setRedirectPath(null), 0);
  };

  return (
    <AuthErrorBoundary>
      <AuthProvider>
        <OrganizationProvider>
          <StockProvider>
            <Router>
              <Routes>
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route path="/verify-email" element={<EmailVerificationPage />} />
                <Route path="/*" element={
                  <ProtectedRoute>
                    <div className="flex h-screen bg-gray-100">
                      <div className={`${isCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 transition-all duration-300`}>
                        {universe === 'procurement' ? (
                          <Sidebar onSwitchToStock={handleSwitchToStock} />
                        ) : (
                          <StockSidebar onSwitchToProcurement={handleSwitchToProcurement} />
                        )}
                      </div>
                      <div className="flex-1 flex flex-col overflow-hidden px-8">
                        <GlobalFilters />
                        <div className="flex-1 overflow-auto -mx-8 px-4">
                          {redirectPath && <Navigate to={redirectPath} replace />}
                          <Routes>
                            {/* Procurement Routes */}
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/locations" element={<LocationsPage />} />
                            <Route path="/suppliers" element={<Suppliers />} />
                            <Route path="/products" element={<Products />} />
                            <Route path="/products/:id" element={<ProductDetail />} />
                            <Route path="/product-categories" element={<ProductCategories />} />
                            <Route path="/price-alerts" element={<PriceAlerts />} />
                            <Route path="/price-negotiations" element={<PriceNegotiations />} />
                            <Route path="/efficiency" element={<Efficiency />} />
                            <Route path="/cogs-analysis" element={<CogsDashboard />} />
                            <Route path="/product-efficiency/:productCode/:locationId?" element={<ProductEfficiency />} />
                            <Route path="/pax" element={<Pax />} />
                            <Route path="/documents" element={<Documents />} />
                            <Route path="/documents/:id" element={<DocumentDetail />} />
                            <Route path="/import" element={<ImportData />} />
                            <Route path="/cases-of-concern" element={<CasesOfConcern />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/help" element={<Help />} />
                            <Route path="/product-targets" element={<ProductTargets />} />
                            
                            {/* Stock Management Routes */}
                            <Route path="/stock" element={<StockDashboard />} />
                            <Route path="/stock/items" element={<StockItems />} />
                            <Route path="/stock/counts" element={<StockCounts />} />
                            <Route path="/stock/deliveries" element={<DeliveryRecords />} />
                            <Route path="/stock/units" element={<StockUnits />} />
                            <Route path="/stock/reports" element={<StockReports />} />
                            <Route path="/stock/history" element={<div className="p-8"><h1 className="text-2xl font-bold">Stock History</h1><p className="text-gray-600">Coming soon...</p></div>} />
                            <Route path="/stock/settings" element={<div className="p-8"><h1 className="text-2xl font-bold">Stock Settings</h1><p className="text-gray-600">Coming soon...</p></div>} />
                            <Route path="/stock/help" element={<div className="p-8"><h1 className="text-2xl font-bold">Stock Help</h1><p className="text-gray-600">Coming soon...</p></div>} />
                          </Routes>
                        </div>
                      </div>
                    </div>
                  </ProtectedRoute>
                } />
              </Routes>
              <Toaster 
                position="bottom-right"
                toastOptions={{
                  className: 'rounded-xl',
                  style: {
                    background: universe === 'stock' ? '#1e40af' : '#064e3b',
                    color: 'white',
                    border: 'none',
                  },
                  duration: 1500,
                }}
              />
            </Router>
          </StockProvider>
        </OrganizationProvider>
      </AuthProvider>
    </AuthErrorBoundary>
  );
}

export default App;

