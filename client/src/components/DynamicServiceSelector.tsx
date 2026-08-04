import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2, ShoppingCart, Clock, ChevronDown } from 'lucide-react';

interface Category { id: string; name: string; key: string; icon: string; }
interface ServiceItem { id: string; name: string; key: string; unit: string; }
interface WorkType { id: string; name: string; key: string; estimatedDuration: number; defaultPrice: number; }
interface ProviderPricingEntry { workTypeId: string; price: number; isActive: boolean; }

export interface SelectedServiceItem {
  serviceItemId: string;
  serviceItemName: string;
  serviceItemKey: string;
  workTypeId: string;
  workTypeName: string;
  workTypeKey: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  estimatedDuration: number;
  unit: string;
}

export interface PriceBreakdown {
  subtotal: number;
  bookingFee: number;
  platformFee: number;
  taxes: number;
  grandTotal: number;
  providerEarnings: number;
  platformCommission: number;
}

interface DynamicServiceSelectorProps {
  providerId: string;
  categoryKey: string;
  onServiceItemsChange: (items: SelectedServiceItem[], breakdown: PriceBreakdown | null) => void;
}

export default function DynamicServiceSelector({
  providerId,
  categoryKey,
  onServiceItemsChange,
}: DynamicServiceSelectorProps) {
  const [category, setCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [providerPricing, setProviderPricing] = useState<ProviderPricingEntry[]>([]);

  const [selectedItem, setSelectedItem] = useState<ServiceItem | null>(null);
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType | null>(null);
  const [quantity, setQuantity] = useState(1);

  const [cart, setCart] = useState<SelectedServiceItem[]>([]);
  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingWorkTypes, setLoadingWorkTypes] = useState(false);
  const [catalogUnavailable, setCatalogUnavailable] = useState(false);

  // Load category and provider pricing on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [catData, pricingData] = await Promise.all([
          api.serviceCatalog.getCategoryByKey(categoryKey),
          api.serviceCatalog.getProviderPricing(providerId),
        ]);
        setCategory(catData);
        setProviderPricing(pricingData || []);

        // Load items for the category
        setLoadingItems(true);
        const itemData = await api.serviceCatalog.getItems(catData.id);
        setItems(itemData || []);
        if (!itemData || itemData.length === 0) setCatalogUnavailable(true);
      } catch {
        setCatalogUnavailable(true);
      } finally {
        setLoadingItems(false);
      }
    };
    if (categoryKey && providerId) load();
  }, [categoryKey, providerId]);

  // Load work types when service item changes
  useEffect(() => {
    if (!selectedItem) { setWorkTypes([]); setSelectedWorkType(null); return; }
    const load = async () => {
      setLoadingWorkTypes(true);
      setSelectedWorkType(null);
      try {
        const data = await api.serviceCatalog.getWorkTypes(selectedItem.id);
        setWorkTypes(data || []);
      } catch {
        setWorkTypes([]);
      } finally {
        setLoadingWorkTypes(false);
      }
    };
    load();
  }, [selectedItem]);

  // Get effective price for a work type
  const getPrice = useCallback((workTypeId: string, defaultPrice: number): number => {
    const entry = providerPricing.find(p => p.workTypeId === workTypeId && p.isActive);
    return entry ? entry.price : defaultPrice;
  }, [providerPricing]);

  // Recalculate breakdown when cart changes
  useEffect(() => {
    if (cart.length === 0) {
      setBreakdown(null);
      onServiceItemsChange([], null);
      return;
    }

    const recalculate = async () => {
      setCalculating(true);
      try {
        const result = await api.serviceCatalog.calculateBooking({
          providerId,
          serviceItems: cart.map(c => ({ workTypeId: c.workTypeId, quantity: c.quantity })),
        });
        setBreakdown(result.priceBreakdown);
        // Merge server-calculated values back into cart for accuracy
        const updatedCart = cart.map((c, i) => ({
          ...c,
          unitPrice: result.serviceItems[i]?.unitPrice ?? c.unitPrice,
          subtotal: result.serviceItems[i]?.subtotal ?? c.subtotal,
        }));
        onServiceItemsChange(updatedCart, result.priceBreakdown);
      } catch {
        // Fallback: compute locally
        const subtotal = cart.reduce((s, c) => s + c.subtotal, 0);
        const bookingFee = 0;
        const platformFee = 0;
        const grandTotal = subtotal;
        const fb: PriceBreakdown = { subtotal, bookingFee, platformFee, taxes: 0, grandTotal, providerEarnings: Math.round(subtotal * 0.95), platformCommission: Math.round(subtotal * 0.05) };
        setBreakdown(fb);
        onServiceItemsChange(cart, fb);
      } finally {
        setCalculating(false);
      }
    };
    recalculate();
  }, [cart]);

  const handleAddToCart = () => {
    if (!selectedItem || !selectedWorkType) return;
    const price = getPrice(selectedWorkType.id, selectedWorkType.defaultPrice);
    const qty = Math.max(1, quantity);
    const newItem: SelectedServiceItem = {
      serviceItemId: selectedItem.id,
      serviceItemName: selectedItem.name,
      serviceItemKey: selectedItem.key,
      workTypeId: selectedWorkType.id,
      workTypeName: selectedWorkType.name,
      workTypeKey: selectedWorkType.key,
      quantity: qty,
      unitPrice: price,
      subtotal: price * qty,
      estimatedDuration: selectedWorkType.estimatedDuration * qty,
      unit: selectedItem.unit,
    };
    // Update quantity if already in cart
    setCart(prev => {
      const exists = prev.findIndex(c => c.workTypeId === newItem.workTypeId);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = { ...updated[exists], quantity: updated[exists].quantity + qty, subtotal: updated[exists].unitPrice * (updated[exists].quantity + qty) };
        return updated;
      }
      return [...prev, newItem];
    });
    // Reset selectors
    setSelectedItem(null);
    setSelectedWorkType(null);
    setQuantity(1);
  };

  const handleRemoveFromCart = (workTypeId: string) => {
    setCart(prev => prev.filter(c => c.workTypeId !== workTypeId));
  };

  const handleUpdateQty = (workTypeId: string, qty: number) => {
    setCart(prev => prev.map(c => c.workTypeId === workTypeId
      ? { ...c, quantity: Math.max(1, qty), subtotal: c.unitPrice * Math.max(1, qty) }
      : c
    ));
  };

  const totalDuration = cart.reduce((s, c) => s + c.estimatedDuration, 0);

  if (catalogUnavailable) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-center text-sm text-muted-foreground">
        <span className="block text-base mb-1">🔧</span>
        Service catalog not yet configured for this category. Please describe your requirements below.
      </div>
    );
  }

  const currentPrice = selectedWorkType ? getPrice(selectedWorkType.id, selectedWorkType.defaultPrice) : 0;
  const canAdd = selectedItem && selectedWorkType;

  return (
    <div className="space-y-3">
      {/* Label */}
      <label className="text-sm font-medium text-foreground block">
        Service Items
        <span className="text-xs text-muted-foreground ml-2 font-normal">Select items &amp; work types</span>
      </label>

      {/* Selector Row */}
      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2.5">
        {/* Step 1: Service Item */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">
            1. Choose Service Item {loadingItems && <span className="inline-block w-2.5 h-2.5 border border-primary border-t-transparent rounded-full animate-spin ml-1" />}
          </span>
          <div className="relative">
            <select
              value={selectedItem?.id || ''}
              onChange={e => {
                const item = items.find(i => i.id === e.target.value) || null;
                setSelectedItem(item);
              }}
              className="w-full px-3 py-2 pr-8 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none appearance-none"
            >
              <option value="">— Select item —</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Step 2: Work Type */}
        {selectedItem && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">
              2. Choose Work Type {loadingWorkTypes && <span className="inline-block w-2.5 h-2.5 border border-primary border-t-transparent rounded-full animate-spin ml-1" />}
            </span>
            <div className="relative">
              <select
                value={selectedWorkType?.id || ''}
                onChange={e => {
                  const wt = workTypes.find(w => w.id === e.target.value) || null;
                  setSelectedWorkType(wt);
                }}
                className="w-full px-3 py-2 pr-8 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none appearance-none"
              >
                <option value="">— Select work type —</option>
                {workTypes.map(w => {
                  const price = getPrice(w.id, w.defaultPrice);
                  return (
                    <option key={w.id} value={w.id}>
                      {w.name} — ₹{price}/{selectedItem.unit} · ~{w.estimatedDuration}min
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        )}

        {/* Step 3: Quantity + Add */}
        {selectedWorkType && (
          <div className="flex flex-col gap-2">
            <div className="flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">
                  3. Quantity ({selectedItem?.unit})
                </span>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="text-right text-sm pb-1.5 shrink-0">
                <div className="text-muted-foreground text-[11px]">Total</div>
                <div className="font-bold text-primary text-base">₹{(currentPrice * quantity).toLocaleString('en-IN')}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!canAdd}
              className="w-full flex items-center justify-center gap-1.5 gradient-primary text-primary-foreground px-3 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add to Booking
            </button>
          </div>
        )}

        {/* Price hint */}
        {selectedWorkType && currentPrice === 0 && (
          <p className="text-xs text-warning">⚠️ Provider hasn't set a price — a default rate will apply.</p>
        )}
      </div>

      {/* Cart / Selected Items */}
      {cart.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-3 py-2 bg-muted/40 border-b border-border flex items-center gap-2">
            <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Selected Services ({cart.length})</span>
            {totalDuration > 0 && (
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                ~{Math.floor(totalDuration / 60) > 0 ? `${Math.floor(totalDuration / 60)}h ` : ''}{totalDuration % 60 > 0 ? `${totalDuration % 60}min` : ''}
              </span>
            )}
          </div>
          <div className="divide-y divide-border">
            {cart.map((c) => (
              <div key={c.workTypeId} className="px-3 py-2.5">
                {/* Top row: name + remove */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground leading-tight">{c.serviceItemName}</div>
                    <div className="text-xs text-muted-foreground">{c.workTypeName} · ₹{c.unitPrice.toLocaleString('en-IN')}/{c.unit}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFromCart(c.workTypeId)}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Bottom row: qty controls + subtotal */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(c.workTypeId, c.quantity - 1)}
                      className="w-7 h-7 rounded-lg border border-border text-foreground flex items-center justify-center text-sm hover:bg-muted transition-colors active:scale-95"
                    >−</button>
                    <span className="w-8 text-center text-sm font-semibold">{c.quantity}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(c.workTypeId, c.quantity + 1)}
                      className="w-7 h-7 rounded-lg border border-border text-foreground flex items-center justify-center text-sm hover:bg-muted transition-colors active:scale-95"
                    >+</button>
                    <span className="text-xs text-muted-foreground ml-1">{c.unit}{c.quantity > 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-sm font-bold text-primary">₹{c.subtotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Price Breakdown */}
          {(breakdown || calculating) && (
            <div className={`border-t border-border bg-primary/5 px-3 py-3 space-y-1.5 ${calculating ? 'opacity-60 animate-pulse' : ''}`}>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal (Service Amount)</span>
                <span>₹{(breakdown?.subtotal ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-foreground border-t border-border pt-1.5 mt-1">
                <span>Total Service Price</span>
                <span className="text-primary">₹{(breakdown?.grandTotal ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight mt-1 pt-1 border-t border-dashed border-border/40">
                ℹ️ Full payment of ₹{(breakdown?.grandTotal ?? 0).toLocaleString('en-IN')} is paid online to ServiceHub website upon booking.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
