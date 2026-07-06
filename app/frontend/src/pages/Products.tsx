import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/lib/supabase';

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

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'tools', label: 'Divination Tools' },
  { value: 'beads', label: 'Sacred Beads' },
  { value: 'books', label: 'Spiritual Books' },
  { value: 'readings', label: 'Readings' },
  { value: 'ritual', label: 'Ritual Items' },
  { value: 'art', label: 'Art & Carvings' },
];

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

// Demo products for when DB is not connected
const DEMO_PRODUCTS: Product[] = [
  { id: '1', title: 'Authentic Opele Divination Chain', description: 'Hand-crafted opele chain used in Ifa divination, made with traditional materials.', price_cents: 12500, currency: 'USD', images: [], category: 'tools', seller_name: 'Baba Ifa Karade', inventory: 5 },
  { id: '2', title: 'Ikin Palm Nuts Set (16 pieces)', description: 'Sacred ikin palm nuts for Ifa divination, properly consecrated.', price_cents: 8900, currency: 'USD', images: [], category: 'tools', seller_name: 'Iya Osun Creations', inventory: 12 },
  { id: '3', title: 'Hand-Carved Opon Ifa Board', description: 'Beautiful hand-carved divination tray with traditional Yoruba motifs.', price_cents: 34500, currency: 'USD', images: [], category: 'art', seller_name: 'Yoruba Heritage', inventory: 3 },
  { id: '4', title: 'Cowrie Shell Reading Set', description: 'Set of 16 cowrie shells prepared for divination readings.', price_cents: 4500, currency: 'USD', images: [], category: 'tools', seller_name: 'Sacred Shells Co', inventory: 20 },
  { id: '5', title: 'Ifa Beaded Necklace - Orunmila', description: 'Traditional green and brown beaded necklace representing Orunmila.', price_cents: 6700, currency: 'USD', images: [], category: 'beads', seller_name: 'Baba Ifa Karade', inventory: 8 },
  { id: '6', title: 'The Complete Guide to Ifa Divination', description: 'Comprehensive book covering all 256 Odu of Ifa with interpretations.', price_cents: 3200, currency: 'USD', images: [], category: 'books', seller_name: 'Yoruba Heritage', inventory: 50 },
  { id: '7', title: 'Ritual Candle Set - Seven Orishas', description: 'Set of seven colored candles for Orisha devotion and ritual work.', price_cents: 2800, currency: 'USD', images: [], category: 'ritual', seller_name: 'Iya Osun Creations', inventory: 30 },
  { id: '8', title: 'Carved Esu Elegba Statue', description: 'Hand-carved wooden statue of Esu Elegba, guardian of the crossroads.', price_cents: 18900, currency: 'USD', images: [], category: 'art', seller_name: 'Yoruba Heritage', inventory: 2 },
];

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [category, sortBy]);

  async function fetchProducts() {
    setLoading(true);
    try {
      let query = supabase.from('app_products').select('*').eq('published', true);

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (sortBy === 'price_low') {
        query = query.order('price_cents', { ascending: true });
      } else if (sortBy === 'price_high') {
        query = query.order('price_cents', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        setProducts(data);
      } else {
        // Use demo data if no DB connection or no data
        let filtered = [...DEMO_PRODUCTS];
        if (category && category !== 'all') {
          filtered = filtered.filter((p) => p.category === category);
        }
        if (sortBy === 'price_low') {
          filtered.sort((a, b) => a.price_cents - b.price_cents);
        } else if (sortBy === 'price_high') {
          filtered.sort((a, b) => b.price_cents - a.price_cents);
        }
        setProducts(filtered);
      }
    } catch {
      // Fallback to demo data
      let filtered = [...DEMO_PRODUCTS];
      if (category && category !== 'all') {
        filtered = filtered.filter((p) => p.category === category);
      }
      setProducts(filtered);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchQuery) {
      params.set('search', searchQuery);
    } else {
      params.delete('search');
    }
    setSearchParams(params);

    // Filter demo products by search
    const filtered = DEMO_PRODUCTS.filter(
      (p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setProducts(filtered.length > 0 ? filtered : DEMO_PRODUCTS);
  }

  function handleCategoryChange(value: string) {
    setCategory(value);
    const params = new URLSearchParams(searchParams);
    if (value !== 'all') {
      params.set('category', value);
    } else {
      params.delete('category');
    }
    setSearchParams(params);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
          <div className="flex gap-2">
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {category !== 'all' && (
          <div className="mb-4">
            <Badge variant="secondary" className="text-sm">
              {CATEGORIES.find((c) => c.value === category)?.label}
              <button onClick={() => handleCategoryChange('all')} className="ml-2 hover:text-destructive">×</button>
            </Badge>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-square bg-muted" />
                <CardContent className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-5 bg-muted rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link key={product.id} to={`/products/${product.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full overflow-hidden">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">🔮</span>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <Badge variant="outline" className="text-xs mb-2">{product.category}</Badge>
                    <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">by {product.seller_name}</p>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-primary">{formatPrice(product.price_cents, product.currency)}</p>
                      {product.inventory <= 3 && product.inventory > 0 && (
                        <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {products.length === 0 && !loading && (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground">No products found matching your criteria.</p>
            <Button variant="outline" className="mt-4" onClick={() => { setCategory('all'); setSearchQuery(''); }}>
              Clear Filters
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}