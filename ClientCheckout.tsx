import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured, TABLES } from '@/lib/supabase';
import { logPaymentEvent } from '@/lib/engineAuditLogger';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  CreditCard,
  Calendar,
  Clock,
  User,
  Home,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

interface ConsultationRequest {
  id: string;
  client_id: string;
  house_id: string;
  awo_id: string | null;
  service_type: string;
  client_notes: string | null;
  preferred_date: string;
  preferred_time: string;
  status: string;
}

const SERVICE_LABELS: Record<string, string> = {
  opele: 'Opele (Chain Divination)',
  ikin: 'Ikín (Sacred Palm Nuts)',
  general_reading: 'General Reading',
};

const SERVICE_PRICES: Record<string, number> = {
  opele: 150,
  ikin: 250,
  general_reading: 75,
};

export default function ClientCheckout() {
  const { requestId } = useParams<{ requestId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState<ConsultationRequest | null>(null);
  const [houseName, setHouseName] = useState('');
  const [awoName, setAwoName] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (searchParams.get('cancelled') === 'true') {
      setCancelled(true);
      toast.error('Payment was cancelled. You can try again.');
    }
    loadRequest();
  }, [requestId, user]);

  async function loadRequest() {
    if (!requestId || !user) {
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setRequest({
        id: requestId,
        client_id: 'mock-client',
        house_id: 'h1',
        awo_id: 'a1',
        service_type: 'opele',
        client_notes: 'I need guidance on a career decision.',
        preferred_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        preferred_time: 'morning',
        status: 'pending_awo_review',
      });
      setHouseName('House of Orunmila');
      setAwoName('Baba Ifasegun');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from(TABLES.consultation_requests)
        .select('*')
        .eq('id', requestId)
        .single();

      if (error || !data) {
        toast.error('Consultation request not found');
        navigate('/client/dashboard');
        return;
      }

      setRequest(data);

      // Fetch house name
      if (data.house_id) {
        const { data: house } = await supabase
          .from(TABLES.engine_houses)
          .select('name')
          .eq('id', data.house_id)
          .single();
        if (house) setHouseName(house.name);
      }

      // Fetch awo name
      if (data.awo_id) {
        const { data: awo } = await supabase
          .from(TABLES.engine_awos)
          .select('awo_name')
          .eq('id', data.awo_id)
          .single();
        if (awo) setAwoName(awo.awo_name);
      }
    } catch (err) {
      console.error('Error loading request:', err);
      toast.error('Failed to load consultation request');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout() {
    if (!request || !user) return;
    setProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in again');
        navigate('/client/login');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/app_consultation_checkout`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            request_id: request.id,
            success_url: `${window.location.origin}/client/payment-success?request_id=${request.id}`,
            cancel_url: `${window.location.origin}/client/checkout/${request.id}?cancelled=true`,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Checkout failed');
      }

      // Log payment event
      await logPaymentEvent('payment_created', {
        entity_type: 'consultation_orders',
        entity_id: result.order_id,
        description: `Payment initiated for consultation request ${request.id}`,
        metadata: {
          request_id: request.id,
          order_id: result.order_id,
          payment_id: result.payment_id,
          amount: SERVICE_PRICES[request.service_type] || 100,
          service_type: request.service_type,
        },
      });

      if (result.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = result.checkout_url;
      } else if (result.simulated) {
        // Simulated payment (no Stripe key)
        toast.success('Payment processed successfully!');
        navigate(`/client/payment-success?request_id=${request.id}&order_id=${result.order_id}`);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900">Request Not Found</h2>
        <p className="text-gray-500 mt-2">This consultation request could not be found.</p>
        <Button className="mt-4" onClick={() => navigate('/client/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const price = SERVICE_PRICES[request.service_type] || 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/client/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-[Rubik]">Checkout</h1>
          <p className="text-sm text-gray-500">Complete payment for your consultation</p>
        </div>
      </div>

      {cancelled && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Payment Cancelled</p>
            <p className="text-xs text-amber-600 mt-1">Your previous payment attempt was cancelled. You can try again below.</p>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-[Rubik]">Order Summary</CardTitle>
          <CardDescription>Review your consultation details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Service Type */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {SERVICE_LABELS[request.service_type] || request.service_type}
                </p>
                <p className="text-xs text-gray-500">Ifá Divination Consultation</p>
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">${price}.00</p>
          </div>

          <Separator />

          {/* Details */}
          <div className="space-y-3">
            {houseName && (
              <div className="flex items-center gap-2 text-sm">
                <Home className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">House:</span>
                <span className="font-medium text-gray-900">{houseName}</span>
              </div>
            )}
            {awoName && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Awo:</span>
                <span className="font-medium text-gray-900">{awoName}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Preferred Date:</span>
              <span className="font-medium text-gray-900">
                {new Date(request.preferred_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Preferred Time:</span>
              <Badge variant="outline" className="text-xs capitalize">{request.preferred_time}</Badge>
            </div>
          </div>

          {request.client_notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-gray-500 mb-1">Your Notes</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{request.client_notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Total */}
          <div className="flex items-center justify-between py-2">
            <p className="text-base font-bold text-gray-900">Total</p>
            <p className="text-2xl font-bold text-indigo-700">${price}.00</p>
          </div>
        </CardContent>
      </Card>

      {/* Security Badge */}
      <div className="flex items-center gap-2 justify-center text-xs text-gray-500">
        <ShieldCheck className="h-4 w-4 text-green-500" />
        <span>Secure payment powered by Stripe</span>
      </div>

      {/* Pay Button */}
      <Button
        className="w-full h-12 text-base font-semibold rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white"
        onClick={handleCheckout}
        disabled={processing}
      >
        {processing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5 mr-2" />
            Pay ${price}.00
          </>
        )}
      </Button>

      <p className="text-xs text-center text-gray-400">
        By proceeding, you agree to our terms of service. Your consultation will be scheduled after payment and Awo acceptance.
      </p>
    </div>
  );
}