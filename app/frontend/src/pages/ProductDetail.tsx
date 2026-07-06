import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Star, Truck, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/contexts/CartContext';
import { supabase, TABLES, DBProduct, DBCategory } from '@/lib/supabase';
import { toast } from 'sonner';

function formatPrice(price: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState<DBProduct | null>(null);
  const [sellerName, setSellerName] = useState('Seller');
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (id) fetchProduct(id);
  }, [id]);

  async function fetchProduct(productId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLES.products)
        .select('*')
        .eq('id', productId)
        .single();

      if (!error && data) {
        setProduct(data);
        // Fetch seller name
        const { data: profile } = await supabase
          .from(TABLES.profiles)
          .select('full_name, email')
          .eq('id', data.seller_id)
          .single();
        if (profile) {
          setSellerName(profile.full_name || profile.email?.split('@')[0] || 'Seller');
        }
        // Fetch category name
        if (data.category_id) {
          const { data: cat } = await supabase
            .from(TABLES.categories)
            .select('name')
            .eq('id', data.category_id)
            .single();
          if (cat) setCategoryName(cat.name);
        }
      } else {
        setProduct(null);
      }
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }

  function handleAddToCart() {
    if (!product) return;
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        title: product.title,
        price_cents: Math.round(product.price * 100),
        currency: product.currency || 'USD',
        image_url: product.images?.[0] || '',
        seller_name: sellerName,
      });
    }
    toast.success(`Added ${quantity} item(s) to cart`);
  }

  const stockQty = product?.stock_quantity ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 container mx-auto px-4 py-8 animate-pulse">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="aspect-square bg-muted rounded-lg" />
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-6 bg-muted rounded w-1/4" />
              <div className="h-20 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-muted-foreground mb-4">Product not found</p>
            <Button onClick={() => navigate('/products')}>Back to Products</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Image */}
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
            {product.images?.[0] ? (
              <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-8xl">🔮</span>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              {categoryName && <Badge variant="outline" className="mb-2">{categoryName}</Badge>}
              <h1 className="text-3xl font-heading font-bold">{product.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">by {sellerName}</p>
            </div>

            <div className="flex items-center gap-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
              <span className="text-sm text-muted-foreground">(12 reviews)</span>
            </div>

            <div className="flex items-center gap-3">
              <p className="text-3xl font-bold text-primary">
                {formatPrice(product.price, product.currency || 'USD')}
              </p>
              {product.compare_at_price && product.compare_at_price > product.price && (
                <p className="text-lg text-muted-foreground line-through">
                  {formatPrice(product.compare_at_price, product.currency || 'USD')}
                </p>
              )}
            </div>

            <Separator />

            <div className="whitespace-pre-line text-muted-foreground">
              {product.description}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Quantity:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.min(stockQty || 99, quantity + 1))}
                    disabled={quantity >= (stockQty || 99)}
                  >
                    +
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">
                  {stockQty > 0 ? `${stockQty} available` : 'In stock'}
                </span>
              </div>

              <Button onClick={handleAddToCart} size="lg" className="w-full" disabled={stockQty === 0 && product.stock_quantity !== null}>
                <ShoppingCart className="h-5 w-5 mr-2" />
                {stockQty === 0 && product.stock_quantity !== null ? 'Out of Stock' : 'Add to Cart'}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-4 w-4" />
                <span>Ships worldwide</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                <span>Verified seller</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}