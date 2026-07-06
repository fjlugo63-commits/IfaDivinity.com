import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, totalCents } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleCheckout() {
    if (!user) {
      toast.error('Please sign in to checkout');
      navigate('/auth');
      return;
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`${supabaseUrl}/functions/v1/app_create_checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.id,
            title: item.title,
            price_cents: item.price_cents,
            quantity: item.quantity,
          })),
          success_url: `${window.location.origin}/orders?success=true`,
          cancel_url: `${window.location.origin}/cart`,
        }),
      });

      const data = await response.json();
      if (data.url) {
        clearCart();
        window.location.href = data.url;
      } else {
        toast.error('Failed to create checkout session');
      }
    } catch {
      toast.error('Checkout failed. Please try again.');
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-heading font-bold">Your cart is empty</h2>
            <p className="text-muted-foreground">Browse our collection of sacred items and divination tools.</p>
            <Link to="/products">
              <Button>Browse Products</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-heading font-bold mb-8">Shopping Cart</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover rounded-md" />
                      ) : (
                        <span className="text-2xl">🔮</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/products/${item.id}`} className="font-medium hover:text-primary line-clamp-1">
                        {item.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">by {item.seller_name}</p>
                      <p className="font-bold text-primary mt-1">
                        {formatPrice(item.price_cents, item.currency)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                  <span>{formatPrice(totalCents, 'USD')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span className="text-muted-foreground">Calculated at checkout</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(totalCents, 'USD')}</span>
                </div>
                <Button onClick={handleCheckout} className="w-full" size="lg">
                  Proceed to Checkout
                </Button>
                <Link to="/products" className="block">
                  <Button variant="outline" className="w-full">Continue Shopping</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}