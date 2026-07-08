import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Suspense, lazy } from 'react';

// Eager load core pages
import Index from './pages/Index';
import Auth from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import AuthError from './pages/AuthError';

// Lazy load other pages to prevent import errors from crashing the whole app
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Orders = lazy(() => import('./pages/Orders'));
const Bookings = lazy(() => import('./pages/Bookings'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'));
const Admin = lazy(() => import('./pages/Admin'));
const SuperAdminSetup = lazy(() => import('./pages/SuperAdminSetup'));
const AwoDashboard = lazy(() => import('./pages/AwoDashboard'));
const ConsultationWorkspace = lazy(() => import('./pages/ConsultationWorkspace'));
const ConsultationHistory = lazy(() => import('./pages/ConsultationHistory'));
const AwoScheduling = lazy(() => import('./pages/AwoScheduling'));
const AwoClients = lazy(() => import('./pages/AwoClients'));
const AwoPayments = lazy(() => import('./pages/AwoPayments'));
const HouseDashboard = lazy(() => import('./pages/HouseDashboard'));
const ClientAuth = lazy(() => import('./pages/ClientAuth'));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));
const ClientAuthCallback = lazy(() => import('./pages/ClientAuthCallback'));
const ClientBookings = lazy(() => import('./pages/ClientBookings'));
const ClientPayments = lazy(() => import('./pages/ClientPayments'));
const ClientMessages = lazy(() => import('./pages/ClientMessages'));
const ClientProfilePage = lazy(() => import('./pages/ClientProfile'));
const AwoMessages = lazy(() => import('./pages/AwoMessages'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/products" element={<Products />} />
      <Route path="/products/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/bookings" element={<Bookings />} />
      <Route path="/seller/dashboard" element={<SellerDashboard />} />
      <Route path="/awo/dashboard" element={<AwoDashboard />} />
      <Route path="/awo/schedule" element={<AwoScheduling />} />
      <Route path="/awo/clients" element={<AwoClients />} />
      <Route path="/awo/payments" element={<AwoPayments />} />
      <Route path="/awo/house" element={<HouseDashboard />} />
      <Route path="/consultation/:id" element={<ConsultationWorkspace />} />
      <Route path="/awo/history" element={<ConsultationHistory />} />
      <Route path="/client/auth" element={<ClientAuth />} />
      <Route path="/client/auth/callback" element={<ClientAuthCallback />} />
      <Route path="/client/dashboard" element={<ClientDashboard />} />
      <Route path="/client/bookings" element={<ClientBookings />} />
      <Route path="/client/payments" element={<ClientPayments />} />
      <Route path="/client/messages" element={<ClientMessages />} />
      <Route path="/client/profile" element={<ClientProfilePage />} />
      <Route path="/awo/messages" element={<AwoMessages />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/error" element={<AuthError />} />
      <Route path="/setup/super-admin" element={<SuperAdminSetup />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
export { AppRoutes };