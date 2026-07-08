import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Bookings from './pages/Bookings';
import SellerDashboard from './pages/SellerDashboard';
import Admin from './pages/Admin';
import AuthCallback from './pages/AuthCallback';
import AuthError from './pages/AuthError';
import SuperAdminSetup from './pages/SuperAdminSetup';
import AwoDashboard from './pages/AwoDashboard';
import ConsultationWorkspace from './pages/ConsultationWorkspace';
import ConsultationHistory from './pages/ConsultationHistory';
import AwoScheduling from './pages/AwoScheduling';
import AwoClients from './pages/AwoClients';
import AwoPayments from './pages/AwoPayments';
import HouseDashboard from './pages/HouseDashboard';
import ClientAuth from './pages/ClientAuth';
import ClientDashboard from './pages/ClientDashboard';
import ClientAuthCallback from './pages/ClientAuthCallback';

const queryClient = new QueryClient();

const AppRoutes = () => (
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
    <Route path="/admin" element={<Admin />} />
    <Route path="/auth/callback" element={<AuthCallback />} />
    <Route path="/auth/error" element={<AuthError />} />
    <Route path="/setup/super-admin" element={<SuperAdminSetup />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
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
);

export default App;
export { AppRoutes };