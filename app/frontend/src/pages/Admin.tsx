import { useState, useEffect } from 'react';
import { Users, Package, ShoppingBag, AlertTriangle, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, TABLES, DBProfile, DBOrder, DBProduct } from '@/lib/supabase';
import { fetchAuditLogs, AuditLog, logAudit } from '@/lib/audit';
import { toast } from 'sonner';

function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function AdminPage() {
  const { userRole } = useAuth();
  const [users, setUsers] = useState<DBProfile[]>([]);
  const [orders, setOrders] = useState<DBOrder[]>([]);
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [sellerNames, setSellerNames] = useState<Record<string, string>>({});
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    loadAuditLogs();
  }, []);

  async function loadAuditLogs() {
    const logs = await fetchAuditLogs(100);
    setAuditLogs(logs);
  }

  async function fetchData() {
    setLoading(true);
    try {
      const [usersRes, ordersRes, productsRes] = await Promise.all([
        supabase.from(TABLES.profiles).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.orders).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.products).select('*').order('created_at', { ascending: false }),
      ]);
      if (usersRes.data) setUsers(usersRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
      if (productsRes.data) {
        setProducts(productsRes.data);
        // Fetch seller names
        const sellerIds = [...new Set(productsRes.data.map((p) => p.seller_id))];
        if (sellerIds.length > 0) {
          const { data: profiles } = await supabase
            .from(TABLES.profiles)
            .select('id, full_name, email')
            .in('id', sellerIds);
          if (profiles) {
            const names: Record<string, string> = {};
            profiles.forEach((p) => {
              names[p.id] = p.full_name || p.email?.split('@')[0] || 'Seller';
            });
            setSellerNames(names);
          }
        }
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelOrder(orderId: string) {
    try {
      const { error } = await supabase
        .from(TABLES.orders)
        .update({ status: 'cancelled' })
        .eq('id', orderId);
      if (error) throw error;
      await logAudit('order.cancelled', 'orders', orderId);
      toast.success('Order cancelled');
      fetchData();
      loadAuditLogs();
    } catch {
      toast.error('Failed to cancel order');
    }
  }

  async function handleToggleProduct(productId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'draft' : 'active';
    try {
      const { error } = await supabase
        .from(TABLES.products)
        .update({ status: newStatus })
        .eq('id', productId);
      if (error) throw error;
      const product = products.find((p) => p.id === productId);
      await logAudit('product.updated', 'products', productId, { title: product?.title, status: newStatus });
      toast.success(newStatus === 'active' ? 'Product published' : 'Product unpublished');
      fetchData();
      loadAuditLogs();
    } catch {
      toast.error('Failed to update product');
    }
  }

  async function handleUpdateUserRole(userId: string, newRole: string) {
    try {
      const targetUser = users.find((u) => u.id === userId);
      const { error } = await supabase
        .from(TABLES.profiles)
        .update({ role: newRole })
        .eq('id', userId);
      if (error) throw error;
      await logAudit('user.role_changed', 'profiles', userId, { email: targetUser?.email, newRole });
      toast.success('User role updated');
      fetchData();
      loadAuditLogs();
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
                <p className="text-2xl font-bold">{formatPrice(orders.reduce((s, o) => s + o.total_amount, 0))}</p>
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
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
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
                          {new Date(order.created_at).toLocaleDateString()} • Buyer: {order.buyer_id?.slice(0, 8) || 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold">{formatPrice(order.total_amount)}</p>
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
                          by {sellerNames[product.seller_id] || 'Seller'} • {formatPrice(product.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                          {product.status}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleProduct(product.id, product.status)}
                        >
                          {product.status === 'active' ? 'Unpublish' : 'Publish'}
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
                        <p className="font-medium">{u.full_name || u.email}</p>
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

          <TabsContent value="audit" className="mt-6">
            {auditLogs.length === 0 ? (
              <Card><CardContent className="text-center py-12">
                <ScrollText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No audit logs yet. Actions will be recorded here.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">{auditLogs.length} log entries</p>
                  <Button variant="outline" size="sm" onClick={loadAuditLogs}>Refresh</Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Timestamp</th>
                        <th className="text-left p-3 font-medium">Action</th>
                        <th className="text-left p-3 font-medium">Resource</th>
                        <th className="text-left p-3 font-medium">Actor</th>
                        <th className="text-left p-3 font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/30">
                          <td className="p-3 text-muted-foreground whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <Badge variant={
                              log.action.includes('deleted') || log.action.includes('cancelled') ? 'destructive' :
                              log.action.includes('created') ? 'default' : 'secondary'
                            }>
                              {log.action}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-xs">
                            {log.resource}
                            {log.resource_id && <span className="text-muted-foreground ml-1">#{log.resource_id.slice(0, 8)}</span>}
                          </td>
                          <td className="p-3 text-muted-foreground font-mono text-xs">
                            {log.actor_id ? log.actor_id.slice(0, 8) : 'system'}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">
                            {Object.keys(log.metadata).length > 0 ? JSON.stringify(log.metadata) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}