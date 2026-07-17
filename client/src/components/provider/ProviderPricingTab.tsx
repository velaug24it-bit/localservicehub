import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronRight, TrendingUp, IndianRupee } from 'lucide-react';

interface Category { id: string; name: string; key: string; icon: string; }
interface ServiceItem { id: string; name: string; key: string; unit: string; }
interface WorkType { id: string; name: string; key: string; estimatedDuration: number; defaultPrice: number; }
interface PricingEntry { id: string; categoryId: string; categoryName: string; serviceItemId: string; serviceItemName: string; workTypeId: string; workTypeName: string; price: number; isActive: boolean; estimatedDuration: number; }

export default function ProviderPricingTab() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [myPricing, setMyPricing] = useState<PricingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-price form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addCatId, setAddCatId] = useState('');
  const [addItems, setAddItems] = useState<ServiceItem[]>([]);
  const [addItemId, setAddItemId] = useState('');
  const [addWorkTypes, setAddWorkTypes] = useState<WorkType[]>([]);
  const [addWorkTypeId, setAddWorkTypeId] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  // Bulk update state
  const [showBulk, setShowBulk] = useState(false);
  const [bulkPct, setBulkPct] = useState('');
  const [bulkCatId, setBulkCatId] = useState('');

  // Expand/collapse categories in the list
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, pricing] = await Promise.all([
        api.serviceCatalog.getCategories(),
        api.providerPricing.list(),
      ]);
      setCategories(cats || []);
      setMyPricing(pricing || []);
      // Auto-expand first category
      if (cats && cats.length > 0) {
        setExpandedCats({ [cats[0].id]: true });
      }
    } catch (err: any) {
      toast({ title: 'Failed to load pricing', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load items when addCat changes
  useEffect(() => {
    if (!addCatId) { setAddItems([]); setAddItemId(''); return; }
    api.serviceCatalog.getItems(addCatId).then(data => { setAddItems(data || []); setAddItemId(''); });
  }, [addCatId]);

  // Load work types when addItem changes
  useEffect(() => {
    if (!addItemId) { setAddWorkTypes([]); setAddWorkTypeId(''); return; }
    api.serviceCatalog.getWorkTypes(addItemId).then(data => { setAddWorkTypes(data || []); setAddWorkTypeId(''); });
  }, [addItemId]);

  const handleAdd = async () => {
    if (!addCatId || !addItemId || !addWorkTypeId || !addPrice) {
      toast({ title: 'Please fill all fields', variant: 'destructive' }); return;
    }
    setAddLoading(true);
    try {
      const cat = categories.find(c => c.id === addCatId)!;
      const item = addItems.find(i => i.id === addItemId)!;
      const wt = addWorkTypes.find(w => w.id === addWorkTypeId)!;
      await api.providerPricing.add({
        categoryId: cat.id, categoryKey: cat.key, categoryName: cat.name,
        serviceItemId: item.id, serviceItemName: item.name, serviceItemKey: item.key,
        workTypeId: wt.id, workTypeName: wt.name, workTypeKey: wt.key,
        price: Number(addPrice),
      });
      toast({ title: '✅ Price added successfully' });
      setShowAddForm(false);
      setAddCatId(''); setAddItemId(''); setAddWorkTypeId(''); setAddPrice('');
      load();
    } catch (err: any) {
      toast({ title: 'Failed to add price', description: err.message, variant: 'destructive' });
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editPrice) return;
    try {
      await api.providerPricing.update(id, { price: Number(editPrice) });
      setMyPricing(prev => prev.map(p => p.id === id ? { ...p, price: Number(editPrice) } : p));
      setEditId(null);
      toast({ title: '✅ Price updated' });
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this pricing entry?')) return;
    try {
      await api.providerPricing.remove(id);
      setMyPricing(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Price deleted' });
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const updated = await api.providerPricing.toggle(id);
      setMyPricing(prev => prev.map(p => p.id === id ? { ...p, isActive: updated.isActive } : p));
    } catch (err: any) {
      toast({ title: 'Toggle failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkPct) { toast({ title: 'Enter a percentage', variant: 'destructive' }); return; }
    const pct = Number(bulkPct);
    if (isNaN(pct)) { toast({ title: 'Invalid percentage', variant: 'destructive' }); return; }
    try {
      const result = await api.providerPricing.bulkUpdate({ percentage: pct, ...(bulkCatId ? { categoryId: bulkCatId } : {}) });
      toast({ title: `✅ Updated ${result.updated} prices by ${pct > 0 ? '+' : ''}${pct}%` });
      setShowBulk(false); setBulkPct('');
      load();
    } catch (err: any) {
      toast({ title: 'Bulk update failed', description: err.message, variant: 'destructive' });
    }
  };

  // Group pricing by category
  const pricingByCat = categories.map(cat => ({
    cat,
    entries: myPricing.filter(p => p.categoryId === cat.id),
  })).filter(g => g.entries.length > 0);

  const totalServices = myPricing.length;
  const activeServices = myPricing.filter(p => p.isActive).length;
  const avgPrice = totalServices > 0 ? Math.round(myPricing.reduce((s, p) => s + p.price, 0) / totalServices) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Services', value: totalServices, icon: '🔧', color: 'text-primary' },
          { label: 'Active', value: activeServices, icon: '✅', color: 'text-success' },
          { label: 'Avg Price', value: `₹${avgPrice}`, icon: '₹', color: 'text-info' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
            <div className="text-lg mb-0.5">{s.icon}</div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-1.5 gradient-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Pricing
        </button>
        <button
          onClick={() => setShowBulk(v => !v)}
          className="flex items-center gap-1.5 border border-border bg-card text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
        >
          <TrendingUp className="w-4 h-4" />
          Bulk Update
        </button>
      </div>

      {/* Add Pricing Form */}
      {showAddForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3 animate-slide-up">
          <h4 className="font-semibold text-foreground text-sm">Add New Pricing</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Category</label>
              <select value={addCatId} onChange={e => setAddCatId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none">
                <option value="">— Select —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Service Item</label>
              <select value={addItemId} onChange={e => setAddItemId(e.target.value)} disabled={!addCatId}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none disabled:opacity-50">
                <option value="">— Select —</option>
                {addItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Work Type</label>
              <select value={addWorkTypeId} onChange={e => setAddWorkTypeId(e.target.value)} disabled={!addItemId}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none disabled:opacity-50">
                <option value="">— Select —</option>
                {addWorkTypes.map(w => <option key={w.id} value={w.id}>{w.name} (default ₹{w.defaultPrice})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Your Price (₹)</label>
              <input type="number" min={0} value={addPrice} onChange={e => setAddPrice(e.target.value)} placeholder="e.g. 350"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleAdd} disabled={addLoading}
              className="gradient-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
              {addLoading && <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
              Save Price
            </button>
            <button onClick={() => setShowAddForm(false)}
              className="border border-border bg-background text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bulk Update Form */}
      {showBulk && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3 animate-slide-up">
          <h4 className="font-semibold text-foreground text-sm">Bulk Price Adjustment</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Category (optional — leave blank for all)</label>
              <select value={bulkCatId} onChange={e => setBulkCatId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none">
                <option value="">All Categories</option>
                {categories.filter(c => myPricing.some(p => p.categoryId === c.id)).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Adjustment % (e.g. +10 or -5)</label>
              <input type="number" value={bulkPct} onChange={e => setBulkPct(e.target.value)} placeholder="+10 or -5"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleBulkUpdate}
              className="gradient-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all">
              Apply
            </button>
            <button onClick={() => setShowBulk(false)}
              className="border border-border bg-background text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pricing List */}
      {myPricing.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center space-y-2">
          <IndianRupee className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="font-semibold text-foreground">No Pricing Set Yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Add your prices for each service you provide. Customers will see your exact rates in the booking flow.
          </p>
          <button onClick={() => setShowAddForm(true)}
            className="gradient-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all mt-2">
            Add First Price
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {pricingByCat.map(({ cat, entries }) => (
            <div key={cat.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Category Header */}
              <button
                type="button"
                onClick={() => setExpandedCats(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                className="w-full px-4 py-3 flex items-center gap-2 hover:bg-muted/30 transition-colors text-left"
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="font-semibold text-foreground text-sm flex-1">{cat.name}</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{entries.length} services</span>
                {expandedCats[cat.id] ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>

              {/* Entries */}
              {expandedCats[cat.id] && (
                <div className="divide-y divide-border border-t border-border">
                  {/* Group by item */}
                  {Array.from(new Set(entries.map(e => e.serviceItemId))).map(itemId => {
                    const itemEntries = entries.filter(e => e.serviceItemId === itemId);
                    const itemName = itemEntries[0]?.serviceItemName;
                    return (
                      <div key={itemId}>
                        <div className="px-4 py-1.5 bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {itemName}
                        </div>
                        {itemEntries.map(entry => (
                          <div key={entry.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-muted/10 transition-colors ${!entry.isActive ? 'opacity-50' : ''}`}>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground">{entry.workTypeName}</div>
                              <div className="text-xs text-muted-foreground">~{entry.estimatedDuration}min</div>
                            </div>
                            {editId === entry.id ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-sm text-muted-foreground">₹</span>
                                <input
                                  type="number"
                                  value={editPrice}
                                  onChange={e => setEditPrice(e.target.value)}
                                  className="w-20 px-2 py-1 text-sm rounded border border-primary bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                  autoFocus
                                />
                                <button onClick={() => handleEdit(entry.id)}
                                  className="text-xs gradient-primary text-primary-foreground px-2 py-1 rounded font-semibold hover:opacity-90">Save</button>
                                <button onClick={() => setEditId(null)}
                                  className="text-xs border border-border text-foreground px-2 py-1 rounded hover:bg-muted transition-colors">✕</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm font-bold text-primary w-16 text-right">₹{entry.price.toLocaleString('en-IN')}</span>
                                <button
                                  onClick={() => handleToggle(entry.id)}
                                  title={entry.isActive ? 'Disable' : 'Enable'}
                                  className="text-muted-foreground hover:text-primary transition-colors"
                                >
                                  {entry.isActive
                                    ? <ToggleRight className="w-5 h-5 text-success" />
                                    : <ToggleLeft className="w-5 h-5" />}
                                </button>
                                <button
                                  onClick={() => { setEditId(entry.id); setEditPrice(String(entry.price)); }}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  title="Edit price"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(entry.id)}
                                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
