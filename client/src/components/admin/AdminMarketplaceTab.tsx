import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Store, ShoppingBag, ListPlus, Receipt, TrendingUp, Plus, Edit2, Trash2, Check, RefreshCw, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { isSameDay } from 'date-fns';

interface Shop {
  id?: string;
  _id: string;
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  location: string;
  gpsLocation: { latitude: number; longitude: number };
  status: string;
  rating: number;
}

interface Product {
  id?: string;
  _id: string;
  name: string;
  brandId: string;
  brandName: string;
  image: string;
  description: string;
  categoryKey: string;
  serviceItemKey: string;
  workTypeKey: string;
  warranty: string;
}

interface Brand {
  id?: string;
  _id?: string;
  name: string;
}

interface InventoryListing {
  id?: string;
  _id?: string;
  shopId: { id?: string; _id?: string; name: string } | null;
  productId: { id?: string; _id?: string; name: string; brandName: string } | null;
  price: number;
  discount: number;
  stock: number;
  estimatedDeliveryHours: number;
  deliveryCharge: number;
  isActive: boolean;
}

interface Order {
  _id?: string;
  id?: string;
  bookingId: string;
  customerId: string;
  shopName: string;
  products: any[];
  subtotal: number;
  deliveryCharge: number;
  grandTotal: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
}

interface Analytics {
  totalShops: number;
  totalProducts: number;
  totalOrders: number;
  totalSales: number;
  shopSales: { name: string; sales: number }[];
}

export default function AdminMarketplaceTab() {
  const [subTab, setSubTab] = useState<'analytics' | 'shops' | 'products' | 'inventory' | 'orders'>('analytics');
  const [loading, setLoading] = useState(false);

  // Data states
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [inventory, setInventory] = useState<InventoryListing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Forms states
  const [shopForm, setShopForm] = useState({ name: '', ownerName: '', phone: '', email: '', address: '', location: 'Chennai', lat: 13.0827, lng: 80.2707, rating: 4.5, status: 'Verified' });
  const [prodForm, setProdForm] = useState({ name: '', brandId: '', image: '📦', description: '', categoryKey: '', serviceItemKey: '', workTypeKey: '', warranty: '1 Year Warranty' });
  const [invForm, setInvForm] = useState({ shopId: '', productId: '', price: 0, discount: 0, stock: 10, estimatedDeliveryHours: 24, deliveryCharge: 0 });
  const [brandFormName, setBrandFormName] = useState('');
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);

  // Filtering states
  const [selectedOrderDate, setSelectedOrderDate] = useState<Date | undefined>(new Date());

  // Editing states
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [editingInvId, setEditingInvId] = useState<string | null>(null);

  useEffect(() => {
    loadSubTabdata();
  }, [subTab]);

  const loadSubTabdata = async () => {
    setLoading(true);
    try {
      if (subTab === 'analytics') {
        const res = await api.admin.marketplace.analytics.get();
        setAnalytics(res);
      } else if (subTab === 'shops') {
        const res = await api.admin.marketplace.shops.list();
        setShops(res || []);
      } else if (subTab === 'products') {
        const res = await api.admin.marketplace.products.list();
        const brandRes = await api.admin.marketplace.brands.list();
        setProducts(res || []);
        setBrands(brandRes || []);
      } else if (subTab === 'inventory') {
        const res = await api.admin.marketplace.inventory.list();
        const shopRes = await api.admin.marketplace.shops.list();
        const prodRes = await api.admin.marketplace.products.list();
        setInventory(res || []);
        setShops(shopRes || []);
        setProducts(prodRes || []);
      } else if (subTab === 'orders') {
        const res = await api.admin.marketplace.orders.list();
        setOrders(res || []);
      }
    } catch (err: any) {
      toast({ title: 'Failed to load marketplace data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Shop actions
  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: shopForm.name,
        ownerName: shopForm.ownerName,
        phone: shopForm.phone,
        email: shopForm.email,
        address: shopForm.address,
        location: shopForm.location,
        gpsLocation: { latitude: shopForm.lat, longitude: shopForm.lng },
        status: shopForm.status,
        rating: shopForm.rating
      };

      if (editingShopId) {
        await api.admin.marketplace.shops.update(editingShopId, payload);
        toast({ title: 'Shop updated successfully' });
      } else {
        await api.admin.marketplace.shops.create(payload);
        toast({ title: 'Shop created successfully' });
      }
      setEditingShopId(null);
      setShopForm({ name: '', ownerName: '', phone: '', email: '', address: '', location: 'Chennai', lat: 13.0827, lng: 80.2707, rating: 4.5, status: 'Verified' });
      loadSubTabdata();
    } catch (err: any) {
      toast({ title: 'Save shop failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleEditShop = (shop: Shop) => {
    setEditingShopId(shop._id);
    setShopForm({
      name: shop.name,
      ownerName: shop.ownerName,
      phone: shop.phone,
      email: shop.email || '',
      address: shop.address,
      location: shop.location,
      lat: shop.gpsLocation?.latitude || 13.0827,
      lng: shop.gpsLocation?.longitude || 80.2707,
      rating: shop.rating,
      status: shop.status
    });
  };

  const handleDeleteShop = async (id: string) => {
    if (!window.confirm('Delete this partner shop? This deletes all associated inventories and marketplace orders!')) return;
    try {
      await api.admin.marketplace.shops.delete(id);
      toast({ title: 'Shop deleted' });
      loadSubTabdata();
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  // Brand actions
  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandFormName.trim()) return;
    try {
      await api.admin.marketplace.brands.create({ name: brandFormName });
      toast({ title: 'Brand added successfully' });
      setBrandFormName('');
      const brandRes = await api.admin.marketplace.brands.list();
      setBrands(brandRes || []);
    } catch (err: any) {
      toast({ title: 'Add brand failed', description: err.message, variant: 'destructive' });
    }
  };

  // Product actions
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProdId) {
        await api.admin.marketplace.products.update(editingProdId, prodForm);
        toast({ title: 'Product updated successfully' });
      } else {
        await api.admin.marketplace.products.create(prodForm);
        toast({ title: 'Product created successfully' });
      }
      setEditingProdId(null);
      setProdForm({ name: '', brandId: '', image: '📦', description: '', categoryKey: '', serviceItemKey: '', workTypeKey: '', warranty: '1 Year Warranty' });
      loadSubTabdata();
    } catch (err: any) {
      toast({ title: 'Save product failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleEditProduct = (prod: Product) => {
    setEditingProdId(prod._id);
    setProdForm({
      name: prod.name,
      brandId: prod.brandId,
      image: prod.image,
      description: prod.description,
      categoryKey: prod.categoryKey,
      serviceItemKey: prod.serviceItemKey,
      workTypeKey: prod.workTypeKey,
      warranty: prod.warranty
    });
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Delete this product? It will be removed from all shop inventories.')) return;
    try {
      await api.admin.marketplace.products.delete(id);
      toast({ title: 'Product deleted' });
      loadSubTabdata();
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  // Inventory actions
  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...invForm,
        estimatedDeliveryHours: deliveryAvailable ? invForm.estimatedDeliveryHours : 0,
        deliveryCharge: deliveryAvailable ? invForm.deliveryCharge : 0
      };

      if (editingInvId) {
        await api.admin.marketplace.inventory.update(editingInvId, payload);
        toast({ title: 'Inventory updated' });
      } else {
        await api.admin.marketplace.inventory.create(payload);
        toast({ title: 'Product listed in shop inventory' });
      }
      setEditingInvId(null);
      setInvForm({ shopId: '', productId: '', price: 0, discount: 0, stock: 10, estimatedDeliveryHours: 24, deliveryCharge: 0 });
      setDeliveryAvailable(true);
      loadSubTabdata();
    } catch (err: any) {
      toast({ title: 'Save inventory failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleEditInventory = (inv: InventoryListing) => {
    setEditingInvId(inv.id || inv._id || null);
    const hasDelivery = inv.estimatedDeliveryHours > 0;
    setDeliveryAvailable(hasDelivery);
    setInvForm({
      shopId: inv.shopId?.id || inv.shopId?._id || '',
      productId: inv.productId?.id || inv.productId?._id || '',
      price: inv.price,
      discount: inv.discount,
      stock: inv.stock,
      estimatedDeliveryHours: inv.estimatedDeliveryHours || 24,
      deliveryCharge: inv.deliveryCharge || 0
    });
  };

  const handleDeleteInventory = async (id: string) => {
    if (!window.confirm('Remove this product listing from the store inventory?')) return;
    try {
      await api.admin.marketplace.inventory.delete(id);
      toast({ title: 'Inventory listing removed' });
      loadSubTabdata();
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  // Order status actions
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.admin.marketplace.orders.update(orderId, { orderStatus: status });
      toast({ title: 'Order status updated to ' + status });
      loadSubTabdata();
    } catch (err: any) {
      toast({ title: 'Update status failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleUpdateOrderPaymentStatus = async (orderId: string, status: string) => {
    try {
      await api.admin.marketplace.orders.update(orderId, { paymentStatus: status });
      toast({ title: 'Order payment status updated to ' + status });
      loadSubTabdata();
    } catch (err: any) {
      toast({ title: 'Update payment failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs header */}
      <div className="flex border-b border-border gap-2 pb-2 overflow-x-auto no-scrollbar">
        {[
          { key: 'analytics', label: 'Marketplace Stats', icon: TrendingUp },
          { key: 'shops', label: 'Partner Shops', icon: Store },
          { key: 'products', label: 'Product Catalog', icon: ShoppingBag },
          { key: 'inventory', label: 'Inventory Manager', icon: ListPlus },
          { key: 'orders', label: 'Customer Orders', icon: Receipt }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => { setSubTab(t.key as any); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                subTab === t.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-2">
          <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground font-semibold">Synchronizing with marketplace database...</span>
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          {/* Analytics Sub Tab */}
          {subTab === 'analytics' && analytics && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-card border border-border p-5 rounded-xl text-center">
                  <span className="text-2xl block">🏪</span>
                  <div className="text-xl font-bold text-foreground mt-1">{analytics.totalShops}</div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Active Shops</span>
                </div>
                <div className="bg-card border border-border p-5 rounded-xl text-center">
                  <span className="text-2xl block">📦</span>
                  <div className="text-xl font-bold text-foreground mt-1">{analytics.totalProducts}</div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Catalog Parts</span>
                </div>
                <div className="bg-card border border-border p-5 rounded-xl text-center">
                  <span className="text-2xl block">🧾</span>
                  <div className="text-xl font-bold text-foreground mt-1">{analytics.totalOrders}</div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Total Orders</span>
                </div>
                <div className="bg-card border border-border p-5 rounded-xl text-center">
                  <span className="text-2xl block">💰</span>
                  <div className="text-xl font-bold text-primary mt-1">₹{analytics.totalSales.toLocaleString()}</div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Material Sales</span>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h4 className="font-semibold text-foreground text-sm mb-4">Partner Store Leaderboard (Sales Volume)</h4>
                {analytics.shopSales.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No transactions completed yet.</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.shopSales.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-muted/30 p-3 rounded-lg text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">#{idx + 1}</span>
                          <span className="font-semibold text-foreground">{s.name}</span>
                        </div>
                        <span className="font-bold text-primary">₹{s.sales.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Shops Sub Tab */}
          {subTab === 'shops' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form */}
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-primary" /> {editingShopId ? 'Edit Partner Shop' : 'Add Partner Shop'}
                </h4>
                <form onSubmit={handleSaveShop} className="space-y-3 text-xs">
                  <div>
                    <label className="font-medium text-foreground block mb-1">Shop Name</label>
                    <input type="text" required value={shopForm.name} onChange={e => setShopForm({...shopForm, name: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-medium text-foreground block mb-1">Owner Name</label>
                      <input type="text" required value={shopForm.ownerName} onChange={e => setShopForm({...shopForm, ownerName: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" />
                    </div>
                    <div>
                      <label className="font-medium text-foreground block mb-1">Owner Phone</label>
                      <input type="tel" required value={shopForm.phone} onChange={e => setShopForm({...shopForm, phone: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" />
                    </div>
                  </div>
                  <div>
                    <label className="font-medium text-foreground block mb-1">Owner Email</label>
                    <input type="email" required value={shopForm.email} onChange={e => setShopForm({...shopForm, email: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" />
                  </div>
                  <div>
                    <label className="font-medium text-foreground block mb-1">Address Details</label>
                    <textarea rows={2} required value={shopForm.address} onChange={e => setShopForm({...shopForm, address: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-none" />
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <div>
                      <label className="font-medium text-foreground block mb-1">District</label>
                      <select value={shopForm.location} onChange={e => setShopForm({...shopForm, location: e.target.value})} className="w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground">
                        {['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Vellore'].map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-medium text-foreground block mb-1">GPS Lat</label>
                      <input type="number" step="any" required value={shopForm.lat} onChange={e => setShopForm({...shopForm, lat: parseFloat(e.target.value) || 0})} className="w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground" />
                    </div>
                    <div>
                      <label className="font-medium text-foreground block mb-1">GPS Lng</label>
                      <input type="number" step="any" required value={shopForm.lng} onChange={e => setShopForm({...shopForm, lng: parseFloat(e.target.value) || 0})} className="w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-medium text-foreground block mb-1">Store Status</label>
                      <select value={shopForm.status} onChange={e => setShopForm({...shopForm, status: e.target.value})} className="w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground">
                        <option value="Verified">Verified</option>
                        <option value="Pending">Pending</option>
                        <option value="Blocked">Blocked</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-medium text-foreground block mb-1">Rating</label>
                      <input type="number" step="0.1" min="1" max="5" required value={shopForm.rating} onChange={e => setShopForm({...shopForm, rating: parseFloat(e.target.value) || 4.5})} className="w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    {editingShopId && (
                      <button type="button" onClick={() => { setEditingShopId(null); setShopForm({ name: '', ownerName: '', phone: '', email: '', address: '', location: 'Chennai', lat: 13.0827, lng: 80.2707, rating: 4.5, status: 'Verified' }); }} className="flex-1 py-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground">Cancel</button>
                    )}
                    <button type="submit" className="flex-1 gradient-primary text-primary-foreground py-2 rounded-lg font-semibold hover:opacity-90">Save Shop</button>
                  </div>
                </form>
              </div>

              {/* List */}
              <div className="lg:col-span-2 space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {shops.map(s => (
                  <div key={s._id} className="bg-card border border-border p-4 rounded-xl flex justify-between items-start gap-4 shadow-sm">
                    <div className="space-y-1 text-xs">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        🏪 {s.name}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          s.status === 'Verified' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                        }`}>{s.status}</span>
                      </div>
                      <div className="text-muted-foreground">Owner: {s.ownerName} • Phone: {s.phone} • Email: {s.email}</div>
                      <div className="text-muted-foreground">Location: {s.address} ({s.location})</div>
                      <div className="text-[10px] text-muted-foreground font-mono">GPS: {s.gpsLocation?.latitude}, {s.gpsLocation?.longitude}</div>
                      <div className="font-bold text-warning">★ {s.rating} / 5</div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => handleEditShop(s)} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteShop(s._id)} className="p-1.5 rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products Sub Tab */}
          {subTab === 'products' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column Forms: Brand Add & Product Add */}
              <div className="space-y-6">
                {/* Brand Add Form */}
                <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                    🏭 Add Product Brand
                  </h4>
                  <form onSubmit={handleCreateBrand} className="flex gap-2 text-xs">
                    <input type="text" required placeholder="e.g. Havells, Anchor" value={brandFormName} onChange={e => setBrandFormName(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground" />
                    <button type="submit" className="px-3 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90">Add</button>
                  </form>
                </div>

                {/* Product Add/Edit Form */}
                <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                    📦 {editingProdId ? 'Edit Catalog Product' : 'Add Catalog Product'}
                  </h4>
                  <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
                    <div>
                      <label className="font-medium text-foreground block mb-1">Product Name</label>
                      <input type="text" required value={prodForm.name} onChange={e => setProdForm({...prodForm, name: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-medium text-foreground block mb-1">Manufacturer Brand</label>
                        <select required value={prodForm.brandId} onChange={e => setProdForm({...prodForm, brandId: e.target.value})} className="w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground">
                          <option value="">Select Brand</option>
                          {brands.map(b => (
                            <option key={b._id} value={b._id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="font-medium text-foreground block mb-1">Part Warranty</label>
                        <input type="text" value={prodForm.warranty} onChange={e => setProdForm({...prodForm, warranty: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <div>
                        <label className="font-medium text-foreground block mb-1">Category</label>
                        <input type="text" placeholder="e.g. electrical" required value={prodForm.categoryKey} onChange={e => setProdForm({...prodForm, categoryKey: e.target.value})} className="w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground" />
                      </div>
                      <div>
                        <label className="font-medium text-foreground block mb-1">Service Item</label>
                        <input type="text" placeholder="e.g. fan" required value={prodForm.serviceItemKey} onChange={e => setProdForm({...prodForm, serviceItemKey: e.target.value})} className="w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground" />
                      </div>
                      <div>
                        <label className="font-medium text-foreground block mb-1">Work Type</label>
                        <input type="text" placeholder="e.g. installation" value={prodForm.workTypeKey} onChange={e => setProdForm({...prodForm, workTypeKey: e.target.value})} className="w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div className="col-span-2">
                        <label className="font-medium text-foreground block mb-1">Description</label>
                        <input type="text" value={prodForm.description} onChange={e => setProdForm({...prodForm, description: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" />
                      </div>
                      <div>
                        <label className="font-medium text-foreground block mb-1">Emoji Icon</label>
                        <input type="text" value={prodForm.image} onChange={e => setProdForm({...prodForm, image: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-center" />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      {editingProdId && (
                        <button type="button" onClick={() => { setEditingProdId(null); setProdForm({ name: '', brandId: '', image: '📦', description: '', categoryKey: '', serviceItemKey: '', workTypeKey: '', warranty: '1 Year Warranty' }); }} className="flex-1 py-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground">Cancel</button>
                      )}
                      <button type="submit" className="flex-1 gradient-primary text-primary-foreground py-2 rounded-lg font-semibold hover:opacity-90">Save Product</button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right Column: Products List */}
              <div className="lg:col-span-2 space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {products.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border border-border rounded-xl bg-card">
                    <p className="text-xs">No products listed in catalog yet.</p>
                  </div>
                ) : products.map(p => (
                  <div key={p._id} className="bg-card border border-border p-4 rounded-xl flex justify-between items-center gap-4 shadow-sm">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-3xl bg-muted p-2 rounded-lg block">{p.image}</span>
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground">{p.name}</div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground">{p.brandName} · {p.warranty}</div>
                        <div className="text-muted-foreground">Keys: {p.categoryKey} → {p.serviceItemKey} {p.workTypeKey ? `(${p.workTypeKey})` : ''}</div>
                        {p.description && <p className="text-[11px] text-muted-foreground leading-normal">{p.description}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => handleEditProduct(p)} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteProduct(p._id)} className="p-1.5 rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inventory Sub Tab */}
          {subTab === 'inventory' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form */}
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                  <ListPlus className="w-4 h-4 text-primary" /> {editingInvId ? 'Edit Inventory' : 'Add Inventory'}
                </h4>
                <form onSubmit={handleSaveInventory} className="space-y-3 text-xs">
                  <div>
                    <label className="font-medium text-foreground block mb-1">Select Partner Shop</label>
                    <select required value={invForm.shopId} onChange={e => setInvForm({...invForm, shopId: e.target.value})} className="w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground">
                      <option value="">Choose Store</option>
                      {shops.map(s => (
                        <option key={s.id || s._id} value={s.id || s._id}>{s.name} ({s.location})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-medium text-foreground block mb-1">Select Product</label>
                    <select required value={invForm.productId} onChange={e => setInvForm({...invForm, productId: e.target.value})} className="w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground">
                      <option value="">Choose Catalog Part</option>
                      {products.map(p => (
                        <option key={p.id || p._id} value={p.id || p._id}>{p.brandName} - {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-medium text-foreground block mb-1">Price (INR)</label>
                      <input type="number" min="0" required value={invForm.price} onChange={e => setInvForm({...invForm, price: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" />
                    </div>
                    <div>
                      <label className="font-medium text-foreground block mb-1">Discount %</label>
                      <input type="number" min="0" max="100" required value={invForm.discount} onChange={e => setInvForm({...invForm, discount: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-medium text-foreground block mb-1">Stock Qty</label>
                      <input type="number" min="0" required value={invForm.stock} onChange={e => setInvForm({...invForm, stock: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" />
                    </div>
                    <div>
                      <label className="font-medium text-foreground block mb-1">Is Delivery Available?</label>
                      <select value={deliveryAvailable ? 'yes' : 'no'} onChange={e => {
                        const avail = e.target.value === 'yes';
                        setDeliveryAvailable(avail);
                        if (!avail) {
                          setInvForm({...invForm, estimatedDeliveryHours: 0, deliveryCharge: 0});
                        }
                      }} className="w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground">
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                  </div>

                  {deliveryAvailable && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-medium text-foreground block mb-1">Delivery Hours</label>
                        <input type="number" min="1" required value={invForm.estimatedDeliveryHours || 24} onChange={e => setInvForm({...invForm, estimatedDeliveryHours: parseInt(e.target.value) || 24})} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" />
                      </div>
                      <div>
                        <label className="font-medium text-foreground block mb-1">Delivery Charge</label>
                        <input type="number" min="0" required value={invForm.deliveryCharge} onChange={e => setInvForm({...invForm, deliveryCharge: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {editingInvId && (
                      <button type="button" onClick={() => { setEditingInvId(null); setInvForm({ shopId: '', productId: '', price: 0, discount: 0, stock: 10, estimatedDeliveryHours: 24, deliveryCharge: 0 }); setDeliveryAvailable(true); }} className="flex-1 py-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground">Cancel</button>
                    )}
                    <button type="submit" className="flex-1 gradient-primary text-primary-foreground py-2 rounded-lg font-semibold hover:opacity-90">Save Inventory</button>
                  </div>
                </form>
              </div>

              {/* Inventory List */}
              <div className="lg:col-span-2 space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {inventory.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border border-border rounded-xl bg-card">
                    <p className="text-xs">No product listings found in store inventory database.</p>
                  </div>
                ) : inventory.map(inv => (
                  <div key={inv._id} className="bg-card border border-border p-4 rounded-xl flex justify-between items-center gap-4 shadow-sm text-xs">
                    <div className="space-y-1">
                      <div className="font-semibold text-foreground">
                        🏪 Store: {inv.shopId?.name || 'Unknown Store'}
                      </div>
                      <div className="text-muted-foreground">
                        📦 Product: <strong className="text-foreground">{inv.productId?.brandName} - {inv.productId?.name}</strong>
                      </div>
                      <div className="text-muted-foreground">
                        Pricing: <span className="font-bold text-primary">₹{inv.price}</span> (Discount: {inv.discount}%) • Stock: <span className="font-bold text-foreground">{inv.stock}</span>
                      </div>
                      <div className="text-muted-foreground">
                        Delivery: {inv.estimatedDeliveryHours > 0 ? `~${inv.estimatedDeliveryHours} hours (Fee: ₹${inv.deliveryCharge})` : 'Not Available'}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => handleEditInventory(inv)} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteInventory(inv.id || inv._id || '')} className="p-1.5 rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders Sub Tab */}
          {subTab === 'orders' && (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Calendar Sidebar */}
              <div className="w-full lg:w-auto flex-shrink-0 bg-card border border-border rounded-xl p-4 shadow-sm h-fit">
                <div className="text-sm font-semibold mb-4 px-2 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" /> Filter by Date
                </div>
                <Calendar
                  mode="single"
                  selected={selectedOrderDate}
                  onSelect={setSelectedOrderDate}
                  className="rounded-md"
                />
                {selectedOrderDate && (
                  <button 
                    onClick={() => setSelectedOrderDate(undefined)}
                    className="w-full mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors py-2 border border-border rounded-lg"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Orders Table */}
              <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold text-[10px] uppercase">
                        <th className="px-6 py-3.5">Order ID / Date</th>
                        <th className="px-6 py-3.5">Seller Shop</th>
                        <th className="px-6 py-3.5">Ordered Items</th>
                        <th className="px-6 py-3.5">Split Total</th>
                        <th className="px-6 py-3.5">Order Status</th>
                        <th className="px-6 py-3.5">Payment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {orders.filter(ord => !selectedOrderDate || isSameDay(new Date(ord.createdAt), selectedOrderDate)).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No orders found for the selected date.</td>
                        </tr>
                      ) : orders.filter(ord => !selectedOrderDate || isSameDay(new Date(ord.createdAt), selectedOrderDate)).map(ord => {
                        const orderId = ord._id || ord.id || '';
                        return (
                        <tr key={orderId} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-foreground">#{orderId.slice(-8).toUpperCase()}</div>
                            <div className="text-muted-foreground">{new Date(ord.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="px-6 py-4 font-medium text-foreground">
                            🏪 {ord.shopName}
                          </td>
                          <td className="px-6 py-4 text-[11px] text-muted-foreground">
                            <ul className="list-disc pl-4 space-y-0.5">
                              {(ord.products || []).map((p, idx) => (
                                <li key={idx}>
                                  {p.brandName} - {p.productName} (x{p.quantity}) - ₹{p.subtotal}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-foreground">₹{ord.grandTotal.toLocaleString()}</div>
                            <div className="text-[10px] text-muted-foreground">Sub: ₹{ord.subtotal} | Del: ₹{ord.deliveryCharge}</div>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={ord.orderStatus}
                              onChange={e => handleUpdateOrderStatus(orderId, e.target.value)}
                              className="px-2.5 py-1 rounded-lg border border-border bg-background text-foreground"
                            >
                              <option value="Placed">Placed</option>
                              <option value="Processing">Processing</option>
                              <option value="Ready for Pickup">Ready for Pickup</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={ord.paymentStatus}
                              onChange={e => handleUpdateOrderPaymentStatus(orderId, e.target.value)}
                              className={`px-2.5 py-1 rounded-lg border border-border text-xs font-semibold ${
                                ord.paymentStatus === 'Paid' ? 'text-success bg-success/5' : 'text-warning bg-warning/5'
                              }`}
                            >
                              <option value="Paid">Paid</option>
                              <option value="Unpaid">Unpaid</option>
                            </select>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
