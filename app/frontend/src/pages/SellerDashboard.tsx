import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Package, DollarSign, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Product {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  currency: string;
  category: string;
  inventory: number;
  published: boolean;
  images: string[];
}

interface SellerOrder {
  id: string;
  buyer_email: string;
  total_cents: number;
  status: string;
  created_at: string;
}

const CATEGORIES = [
  { value: 'tools', label: 'Divination Tools' },
  { value: 'beads', label: 'Sacred Beads' },
  { value: 'books', label: 'Spiritual Books' },
  { value: 'readings', label: 'Readings' },
  { value: 'ritual', label: 'Ritual Items' },
  { value: 'art', label: 'Art & Carvings' },
];

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function SellerDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceDollars, setPriceDollars] = useState('');
  const [category, setCategory] = useState('');
  const [inventory, setInventory] = useState('1');
  const [published, setPublished] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchOrders();
    }
  }, [user]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_products')
        .select('*')
        .eq('seller_id', user!.id)
        .order('created_at', { ascending: false });
      if (!error && data) setProducts(data);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrders() {
    try {
      const { data, error } = await supabase
        .from('app_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setOrders(data);
    } catch {
      // Silent
    }
  }

  function openCreateDialog() {
    setEditingProduct(null);
    setTitle('');
    setDescription('');
    setPriceDollars('');
    setCategory('');
    setInventory('1');
    setPublished(true);
    setDialogOpen(true);
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product);
    setTitle(product.title);
    setDescription(product.description);
    setPriceDollars((product.price_cents / 100).toString());
    setCategory(product.category);
    setInventory(product.inventory.toString());
    setPublished(product.published);
    setDialogOpen(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = Math.round(parseFloat(priceDollars) * 100);

    const productData = {
      title,
      description,
      price_cents: priceCents,
      currency: 'USD',
      category,
      inventory: parseInt(inventory),
      published,
      seller_id: user!.id,
      seller_name: user!.email?.split('@')[0] || 'Seller',
      images: [],
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('app_products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast.success('Product updated');
      } else {
        const { error } = await supabase
          .from('app_products')
          .insert(productData);
        if (error) throw error;
        toast.success('Product created');
      }
      setDialogOpen(false);
      fetchProducts();
    } catch {
      toast.error('Failed to save product. Make sure Supabase is connected.');
    }
  }

  async function handleDeleteProduct(id: string) {
    try {
      const { error } = await supabase.from('app_products').delete().eq('id', id);
      if (error) throw error;
      toast.success('Product deleted');
      fetchProducts();
    } catch {
      toast.error('Failed to delete product');
    }
  }

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_cents || 0), 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-heading font-bold">Seller Dashboard</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Product' : 'Create New Product'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Product Title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (USD)</Label>
                    <Input id="price" type="number" step="0.01" min="0" value={priceDollars} onChange={(e) => setPriceDollars(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inventory">Inventory</Label>
                    <Input id="inventory" type="number" min="0" value={inventory} onChange={(e) => setInventory(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={published} onCheckedChange={setPublished} />
                  <Label>Published (visible to buyers)</Label>
                </div>
                <Button type="submit" className="w-full">
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{products.length}</p>
                <p className="text-sm text-muted-foreground">Products</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <Eye className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{orders.length}</p>
                <p className="text-sm text-muted-foreground">Orders</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{formatPrice(totalRevenue)}</p>
                <p className="text-sm text-muted-foreground">Revenue</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-6 bg-muted rounded w-1/3" /></CardContent></Card>
                ))}
              </div>
            ) : products.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No products yet</p>
                  <p className="text-muted-foreground mb-4">Create your first product listing to start selling.</p>
                  <Button onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <Card key={product.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">🔮</div>
                        <div>
                          <h3 className="font-medium">{product.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{product.category}</Badge>
                            <span className="text-sm text-muted-foreground">{formatPrice(product.price_cents)}</span>
                            <span className="text-sm text-muted-foreground">• {product.inventory} in stock</span>
                            {!product.published && <Badge variant="secondary" className="text-xs">Draft</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteProduct(product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">No orders received yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatPrice(order.total_cents)}</p>
                        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>{order.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}