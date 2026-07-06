import { useState, useEffect } from 'react';
import { Users, Package, ShoppingBag, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

interface AdminOrder {
  id: string;
  buyer_id: string;
  total_cents: number;
  currency: string;
  status: string;
  created_at: string;
}

interface AdminProduct {
  id: string;
  title: string;
  seller_name: string;
  price_cents: number;
  published: boolean;
  category: string;
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function AdminPage() {
  const { userRole } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [usersRes, ordersRes, productsRes] = await Promise.all([
        supabase.from('app_users').select('*').order('created_at', { ascending: false }),
        supabase.from('app_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('app_products').select('*').order('created_at', { ascending: false }),
      ]);
      if (usersRes.data) setUsers(usersRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
      if (productsRes.data) setProducts(productsRes.data);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelOrder(orderId: string) {
    try {
      const { error } = await supabase
        .from('app_orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);
      if (error) throw error;
      toast.success('Order cancelled');
      fetchData();
    } catch {
      toast.error('Failed to cancel order');
    }
  }

  async function handleToggleProduct(productId: string, published: boolean) {
    try {
      const { error } = await supabase
        .from('app_products')
        .update({ published: !published })
        .eq('id', productId);
      if (error) throw error;
      toast.success(published ? 'Product unpublished' : 'Product published');
      fetchData();
    } catch {
      toast.error('Failed to update product');
    }
  }

  async function handleUpdateUserRole(userId: string, newRole: string) {
    try {
      const { error } = await supabase
        .from('app_users')
        .update({ role: newRole })
        .eq('id', userId);
      if (error) throw error;
      toast.success('User role updated');
      fetchData();
    } catch {
      toast.error('Failed to update user role');
    }
  }

  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="text-center p-8">
              <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You need admin privileges to access this page.</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-heading font-bold mb-8">Admin Panel</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Users</p>
              </div>
            </CardContent>
          </Card>
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
              <ShoppingBag className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{orders.length}</p>
                <p className="text-sm text-muted-foreground">Orders</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <span className="text-2xl">💰</span>
              <div>
                <p className="text-2xl font-bold">{formatPrice(orders.reduce((s, o) => s + o.total_cents, 0))}</p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders">
          <TabsList>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6">
            {loading ? (
              <div className="space-y-4">{[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-6 bg-muted rounded w-1/3" /></CardContent></Card>)}</div>
            ) : orders.length === 0 ? (
              <Card><CardContent className="text-center py-12"><p className="text-muted-foreground">No orders yet.</p></CardContent></Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()} • Buyer: {order.buyer_id.slice(0, 8)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold">{formatPrice(order.total_cents)}</p>
                          <Badge variant={order.status === 'cancelled' ? 'destructive' : order.status === 'completed' ? 'default' : 'secondary'}>
                            {order.status}
                          </Badge>
                        </div>
                        {order.status !== 'cancelled' && (
                          <Button variant="destructive" size="sm" onClick={() => handleCancelOrder(order.id)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            {products.length === 0 ? (
              <Card><CardContent className="text-center py-12"><p className="text-muted-foreground">No products yet.</p></CardContent></Card>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <Card key={product.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <h3 className="font-medium">{product.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          by {product.seller_name} • {product.category} • {formatPrice(product.price_cents)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={product.published ? 'default' : 'secondary'}>
                          {product.published ? 'Published' : 'Draft'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleProduct(product.id, product.published)}
                        >
                          {product.published ? 'Unpublish' : 'Publish'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            {users.length === 0 ? (
              <Card><CardContent className="text-center py-12"><p className="text-muted-foreground">No users yet.</p></CardContent></Card>
            ) : (
              <div className="space-y-4">
                {users.map((u) => (
                  <Card key={u.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{u.name || u.email}</p>
                        <p className="text-sm text-muted-foreground">{u.email} • Joined {new Date(u.created_at).toLocaleDateString()}</p>
                      </div>
                      <Select value={u.role} onValueChange={(val) => handleUpdateUserRole(u.id, val)}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buyer">Buyer</SelectItem>
                          <SelectItem value="seller">Seller</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
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