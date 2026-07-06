import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Star, Truck, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Product {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  currency: string;
  images: string[];
  category: string;
  seller_name: string;
  inventory: number;
}

const DEMO_PRODUCTS: Record<string, Product> = {
  '1': { id: '1', title: 'Authentic Opele Divination Chain', description: 'Hand-crafted opele chain used in Ifa divination. Made with traditional materials by experienced practitioners. The opele is the primary tool of the Babalawo for casting Ifa divination. Each chain is consecrated and prepared according to traditional rites.\n\nThis opele features eight half-seed pods strung on a brass chain, with each pod carefully selected for its spiritual properties. The chain measures approximately 18 inches in length.', price_cents: 12500, currency: 'USD', images: [], category: 'tools', seller_name: 'Baba Ifa Karade', inventory: 5 },
  '2': { id: '2', title: 'Ikin Palm Nuts Set (16 pieces)', description: 'Sacred ikin palm nuts for Ifa divination, properly consecrated. These are the traditional palm nuts used in the most sacred form of Ifa divination. Each set contains 16 carefully selected nuts.\n\nThe ikin are sourced from sacred palm trees and prepared through traditional rituals. They come in a hand-sewn cloth pouch.', price_cents: 8900, currency: 'USD', images: [], category: 'tools', seller_name: 'Iya Osun Creations', inventory: 12 },
  '3': { id: '3', title: 'Hand-Carved Opon Ifa Board', description: 'Beautiful hand-carved divination tray with traditional Yoruba motifs. The Opon Ifa is the sacred divination board upon which the Babalawo marks the sacred signs of Ifa.\n\nThis board is carved from a single piece of iroko wood, featuring the face of Esu at the top and intricate geometric patterns around the border. Measures 16 inches in diameter.', price_cents: 34500, currency: 'USD', images: [], category: 'art', seller_name: 'Yoruba Heritage', inventory: 3 },
  '4': { id: '4', title: 'Cowrie Shell Reading Set', description: 'Set of 16 cowrie shells prepared for divination readings. Cowrie shell divination (Merindinlogun) is one of the most accessible forms of Yoruba divination.\n\nEach shell has been carefully opened and prepared for casting. Includes a velvet pouch and basic instruction guide.', price_cents: 4500, currency: 'USD', images: [], category: 'tools', seller_name: 'Sacred Shells Co', inventory: 20 },
  '5': { id: '5', title: 'Ifa Beaded Necklace - Orunmila', description: 'Traditional green and brown beaded necklace representing Orunmila, the Orisha of wisdom and divination. Handmade with glass beads in the sacred colors.\n\nLength: 24 inches. Suitable for daily wear or ceremonial use.', price_cents: 6700, currency: 'USD', images: [], category: 'beads', seller_name: 'Baba Ifa Karade', inventory: 8 },
  '6': { id: '6', title: 'The Complete Guide to Ifa Divination', description: 'Comprehensive book covering all 256 Odu of Ifa with interpretations, prayers, and practical guidance. Written by a senior Babalawo with over 30 years of practice.\n\n450 pages, hardcover. Includes diagrams and reference tables.', price_cents: 3200, currency: 'USD', images: [], category: 'books', seller_name: 'Yoruba Heritage', inventory: 50 },
  '7': { id: '7', title: 'Ritual Candle Set - Seven Orishas', description: 'Set of seven colored candles for Orisha devotion and ritual work. Each candle corresponds to a specific Orisha and is made with natural beeswax.\n\nIncludes: White (Obatala), Blue (Yemoja), Yellow (Oshun), Red (Shango), Green (Ogun), Purple (Oya), Black/Red (Esu).', price_cents: 2800, currency: 'USD', images: [], category: 'ritual', seller_name: 'Iya Osun Creations', inventory: 30 },
  '8': { id: '8', title: 'Carved Esu Elegba Statue', description: 'Hand-carved wooden statue of Esu Elegba, guardian of the crossroads and divine messenger. Carved from sacred iroko wood by master carvers.\n\nHeight: 12 inches. Each piece is unique with slight variations in detail.', price_cents: 18900, currency: 'USD', images: [], category: 'art', seller_name: 'Yoruba Heritage', inventory: 2 },
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (id) fetchProduct(id);
  }, [id]);

  async function fetchProduct(productId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_products')
        .select('*')
        .eq('id', productId)
        .single();

      if (!error && data) {
        setProduct(data);
      } else {
        setProduct(DEMO_PRODUCTS[productId] || null);
      }
    } catch {
      setProduct(DEMO_PRODUCTS[productId] || null);
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
        price_cents: product.price_cents,
        currency: product.currency,
        image_url: product.images?.[0] || '',
        seller_name: product.seller_name,
      });
    }
    toast.success(`Added ${quantity} item(s) to cart`);
  }

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
              <Badge variant="outline" className="mb-2">{product.category}</Badge>
              <h1 className="text-3xl font-heading font-bold">{product.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">by {product.seller_name}</p>
            </div>

            <div className="flex items-center gap-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
              <span className="text-sm text-muted-foreground">(12 reviews)</span>
            </div>

            <p className="text-3xl font-bold text-primary">
              {formatPrice(product.price_cents, product.currency)}
            </p>

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
                    onClick={() => setQuantity(Math.min(product.inventory, quantity + 1))}
                    disabled={quantity >= product.inventory}
                  >
                    +
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">
                  {product.inventory} available
                </span>
              </div>

              <Button onClick={handleAddToCart} size="lg" className="w-full" disabled={product.inventory === 0}>
                <ShoppingCart className="h-5 w-5 mr-2" />
                {product.inventory === 0 ? 'Out of Stock' : 'Add to Cart'}
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