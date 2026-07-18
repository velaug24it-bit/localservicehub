import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { SelectedServiceItem } from '@/components/DynamicServiceSelector';
import { ShoppingCart, Star, MapPin, Truck, ShieldAlert, Check, Plus, Minus, ArrowLeftRight, X } from 'lucide-react';

interface Product {
  id: string;
  productId: string;
  name: string;
  brandName: string;
  image: string;
  description: string;
  specifications: Record<string, any>;
  warranty: string;
  price: number;
  discount: number;
  finalPrice: number;
  stock: number;
  estimatedDeliveryHours: number;
  deliveryCharge: number;
  distance: number;
  shop: {
    id: string;
    name: string;
    ownerName: string;
    phone: string;
    address: string;
    location: string;
    rating: number;
    deliveryAvailable: boolean;
    pickupAvailable: boolean;
  };
}

interface MaterialsMarketplaceProps {
  categoryKey: string;
  serviceItems: SelectedServiceItem[];
  userLocation: string;
  onMaterialsSelected: (data: {
    materialsRequired: boolean;
    materialsList: any[];
    shopId: string | null;
    deliveryMethod: 'Pickup' | 'Delivery';
    materialsTotal: number;
  }) => void;
}

export default function MaterialsMarketplace({
  categoryKey,
  serviceItems,
  userLocation,
  onMaterialsSelected,
  skipChoiceScreen = false
}: {
  categoryKey: string;
  serviceItems: SelectedServiceItem[];
  userLocation: string;
  skipChoiceScreen?: boolean;
  onMaterialsSelected: (data: {
    materialsRequired: boolean;
    materialsList: any[];
    shopId: string | null;
    deliveryMethod: 'Pickup' | 'Delivery';
    materialsTotal: number;
  }) => void;
}) {
  // If BookingModal already collected the choice, skip the choice screen
  const [materialsRequired, setMaterialsRequired] = useState<boolean | null>(skipChoiceScreen ? true : null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters & Sorting
  const [sortBy, setSortBy] = useState<string>('nearest');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);

  // Cart State (Only 1 shop allowed at a time)
  const [cart, setCart] = useState<{ [productId: string]: { product: Product; quantity: number } }>({});
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<'Pickup' | 'Delivery'>('Pickup');

  // Compare State (Up to 3 products)
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  // Fetch products matching selected service items
  useEffect(() => {
    if (materialsRequired !== true || serviceItems.length === 0) return;

    const fetchMarketplace = async () => {
      setLoading(true);
      try {
        // Collect all products for all service items in parallel
        const allFetched: Product[] = [];
        for (const item of serviceItems) {
          const res = await api.marketplace.getProducts({
            categoryKey,
            serviceItemKey: item.serviceItemKey || item.serviceItemName,
            workTypeKey: item.workTypeKey || item.workTypeName,
            location: userLocation,
            sortBy
          });
          if (res && Array.isArray(res.products)) {
            allFetched.push(...res.products);
          }
        }

        // Deduplicate products by product inventory listing ID
        const unique: { [id: string]: Product } = {};
        allFetched.forEach(p => {
          unique[p.id] = p;
        });

        const dedupedList = Object.values(unique);
        setProducts(dedupedList);

        // Extract unique brands
        const brands = Array.from(new Set(dedupedList.map(p => p.brandName)));
        setAvailableBrands(brands);
      } catch (err) {
        console.error('Failed to load marketplace products:', err);
        toast({ title: 'Error', description: 'Failed to load products from marketplace.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchMarketplace();
  }, [materialsRequired, serviceItems, categoryKey, userLocation, sortBy]);

  // Sync to parent component
  useEffect(() => {
    if (materialsRequired === true && selectedShopId) {
      const itemsList = Object.values(cart).map(c => ({
        productId: c.product.productId,
        productName: c.product.name,
        brandName: c.product.brandName,
        quantity: c.quantity,
        price: c.product.price,
        discount: c.product.discount,
        finalUnitPrice: c.product.finalPrice,
        subtotal: c.product.finalPrice * c.quantity
      }));

      const subtotal = itemsList.reduce((sum, item) => sum + item.subtotal, 0);
      const deliveryCharge = deliveryMethod === 'Delivery' 
        ? Math.max(...Object.values(cart).map(c => c.product.deliveryCharge || 0), 0)
        : 0;

      onMaterialsSelected({
        materialsRequired: true,
        materialsList: itemsList,
        shopId: selectedShopId,
        deliveryMethod,
        materialsTotal: subtotal + deliveryCharge
      });
    } else {
      onMaterialsSelected({
        materialsRequired: false,
        materialsList: [],
        shopId: null,
        deliveryMethod: 'Pickup',
        materialsTotal: 0
      });
    }
  }, [materialsRequired, cart, selectedShopId, deliveryMethod]);

  const handleAddToCart = (product: Product) => {
    if (selectedShopId && selectedShopId !== product.shop.id) {
      // Prompt before clearing cart of previous shop
      const confirmSwitch = window.confirm(`You can only purchase materials from one shop per booking. Switch to "${product.shop.name}" and clear your current selection?`);
      if (!confirmSwitch) return;
      
      setCart({ [product.productId]: { product, quantity: 1 } });
      setSelectedShopId(product.shop.id);
      return;
    }

    setCart(prev => ({
      ...prev,
      [product.productId]: { product, quantity: 1 }
    }));
    setSelectedShopId(product.shop.id);
  };

  const handleUpdateQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      const updated = { ...cart };
      delete updated[productId];
      setCart(updated);
      
      if (Object.keys(updated).length === 0) {
        setSelectedShopId(null);
      }
      return;
    }

    const item = cart[productId];
    if (item.product.stock < quantity) {
      toast({ title: 'Stock Limit Reached', description: `Only ${item.product.stock} units available in stock.`, variant: 'destructive' });
      return;
    }

    setCart(prev => ({
      ...prev,
      [productId]: { ...prev[productId], quantity }
    }));
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  const toggleCompare = (product: Product) => {
    setCompareList(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        return prev.filter(p => p.id !== product.id);
      }
      if (prev.length >= 3) {
        toast({ title: 'Comparison limit', description: 'You can compare up to 3 products at a time.' });
        return prev;
      }
      return [...prev, product];
    });
  };

  // Filtered listing
  const filteredProducts = products.filter(p => {
    if (selectedBrands.length > 0 && !selectedBrands.includes(p.brandName)) return false;
    return true;
  });

  const cartTotal = Object.values(cart).reduce((sum, item) => sum + item.product.finalPrice * item.quantity, 0);
  const deliveryCharge = deliveryMethod === 'Delivery'
    ? Math.max(...Object.values(cart).map(c => c.product.deliveryCharge || 0), 0)
    : 0;

  if (materialsRequired === null) {
    return (
      <div className="space-y-4">
        <label className="text-sm font-semibold text-foreground block mb-2">
          Will materials be required for this service?
        </label>
        <div className="grid grid-cols-1 gap-2.5">
          <button
            type="button"
            onClick={() => setMaterialsRequired(false)}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border bg-card hover:bg-muted text-left transition-all active:scale-[0.99]"
          >
            <div className="w-5 h-5 rounded-full border border-primary/40 flex items-center justify-center shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-transparent" />
            </div>
            <div>
              <div className="font-semibold text-sm">I already have the required materials</div>
              <div className="text-xs text-muted-foreground mt-0.5">Provider will visit to perform labor only</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMaterialsRequired(true)}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-left transition-all active:scale-[0.99] group"
          >
            <div className="w-5 h-5 rounded-full border border-primary flex items-center justify-center shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm text-primary flex items-center gap-1.5">
                Provider should arrange the materials
                <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">Marketplace</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Purchase certified parts from verified partner stores nearby</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (materialsRequired === false) {
    return (
      <div className="bg-success/5 border border-success/20 rounded-xl p-4 flex gap-3 text-sm text-success-foreground">
        <Check className="w-5 h-5 text-success shrink-0" />
        <div>
          <span className="font-semibold block">Materials Self-Arranged</span>
          You have chosen to arrange materials yourself. The provider will handle installation using your parts.
          <button
            type="button"
            onClick={() => setMaterialsRequired(null)}
            className="text-xs font-semibold text-primary block mt-1 hover:underline"
          >
            Change Choice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header — only show internal reset if not in parent-controlled mode */}
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-wider block">ServiceHub Marketplace</span>
          <h4 className="font-bold text-foreground text-sm">Browse Materials for Your Booking</h4>
        </div>
        {!skipChoiceScreen && (
          <button
            type="button"
            onClick={() => {
              setMaterialsRequired(null);
              setCart({});
              setSelectedShopId(null);
              setCompareList([]);
            }}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset Selection
          </button>
        )}
      </div>

      {/* No service items selected guard */}
      {serviceItems.length === 0 && (
        <div className="text-center py-8 bg-muted/30 border border-dashed border-border rounded-2xl space-y-2">
          <span className="text-2xl block">🛠️</span>
          <p className="text-sm font-semibold text-foreground">No service items selected</p>
          <p className="text-xs text-muted-foreground px-4">Go back to Step 1 and select a service item (e.g. Fan, Switch, Tap) to see matching products from nearby shops.</p>
        </div>
      )}

      {/* Brand Filters & Sorting Row */}
      <div className="space-y-2">
        {availableBrands.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground mr-1">Brands:</span>
            {availableBrands.map(b => (
              <button
                type="button"
                key={b}
                onClick={() => toggleBrand(b)}
                className={`text-[10px] font-semibold px-2 py-1 rounded-full border transition-all ${
                  selectedBrands.includes(b)
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-card border-border text-muted-foreground hover:border-muted-foreground/30'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground font-medium">Sort by:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary outline-none"
          >
            <option value="nearest">Nearest Store</option>
            <option value="lowest_price">Lowest Price</option>
            <option value="highest_rating">Highest Rating</option>
            <option value="fastest_delivery">Fastest Delivery</option>
          </select>
        </div>
      </div>

      {/* Compare list alert */}
      {compareList.length > 0 && (
        <div className="flex items-center justify-between bg-card border border-border rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs text-foreground font-semibold">
              Comparing {compareList.length} product{compareList.length > 1 ? 's' : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowCompare(true)}
            className="text-xs font-bold text-primary hover:underline"
          >
            View Comparison
          </button>
        </div>
      )}

      {/* Products Listings */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-2 bg-card border border-border rounded-2xl">
          <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground font-semibold">Scanning nearby stores for materials...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-10 bg-card border border-border rounded-2xl space-y-2">
          <span className="text-2xl block">🔍</span>
          <p className="text-xs text-muted-foreground">No matching materials found in nearby verified shops.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-1">
          {filteredProducts.map(p => {
            const inCart = cart[p.productId];
            const isComparing = compareList.some(item => item.id === p.id);

            return (
              <div
                key={p.id}
                className={`bg-card border rounded-2xl p-3 flex gap-3 shadow-sm hover:shadow transition-all ${
                  inCart ? 'border-primary/45 bg-primary/[0.01]' : 'border-border'
                }`}
              >
                {/* Image */}
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">
                  {p.image}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-1.5">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">{p.brandName}</span>
                      <h5 className="font-semibold text-foreground text-xs leading-tight line-clamp-1">{p.name}</h5>
                    </div>
                    {/* Struck price / Price */}
                    <div className="text-right shrink-0">
                      {p.discount > 0 && (
                        <span className="text-[10px] line-through text-muted-foreground block leading-tight">₹{p.price}</span>
                      )}
                      <span className="font-bold text-primary text-xs leading-tight block">₹{p.finalPrice}</span>
                    </div>
                  </div>

                  {/* Shop Details */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                    <span className="font-semibold text-foreground inline-flex items-center gap-0.5">
                      🏪 {p.shop.name}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-warning fill-warning" /> {p.shop.rating}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-muted-foreground" /> {p.distance} km
                    </span>
                  </div>

                  {/* Stock & Delivery details */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className={`text-[9px] font-bold uppercase ${p.stock < 3 ? 'text-destructive' : 'text-success'}`}>
                      {p.stock < 3 ? `Only ${p.stock} left!` : 'In Stock'}
                    </span>
                    
                    <span className="text-[9px] text-muted-foreground inline-flex items-center gap-0.5">
                      <Truck className="w-3 h-3 text-muted-foreground" /> ~{p.estimatedDeliveryHours}h delivery
                    </span>
                  </div>

                  {/* Card Controls */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 mt-1">
                    {/* Compare Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleCompare(p)}
                      className={`text-[9px] font-semibold inline-flex items-center gap-1 transition-all ${
                        isComparing ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      {isComparing ? 'Comparing' : 'Compare'}
                    </button>

                    {/* Add to Cart Button / Qty */}
                    {inCart ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(p.productId, inCart.quantity - 1)}
                          className="w-5 h-5 rounded border border-border text-foreground flex items-center justify-center text-xs hover:bg-muted active:scale-90 transition-all"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold">{inCart.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(p.productId, inCart.quantity + 1)}
                          className="w-5 h-5 rounded border border-border text-foreground flex items-center justify-center text-xs hover:bg-muted active:scale-90 transition-all"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(p)}
                        className="gradient-primary text-primary-foreground px-2.5 py-1 rounded-lg text-[10px] font-bold hover:opacity-90 transition-all active:scale-[0.97]"
                      >
                        Add Material
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart Summary Block (Single Shop Only) */}
      {selectedShopId && Object.keys(cart).length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground inline-flex items-center gap-1">
              🛒 Material Cart ({Object.keys(cart).length} item{Object.keys(cart).length > 1 ? 's' : ''})
            </span>
            <span className="text-[10px] text-muted-foreground">Store: {Object.values(cart)[0].product.shop.name}</span>
          </div>

          {/* Delivery Method Selection */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">Delivery Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryMethod('Pickup')}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                  deliveryMethod === 'Pickup'
                    ? 'bg-card border-primary text-primary shadow-sm'
                    : 'bg-transparent border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                🚴 Provider Pickup (Free)
              </button>
              <button
                type="button"
                onClick={() => setDeliveryMethod('Delivery')}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                  deliveryMethod === 'Delivery'
                    ? 'bg-card border-primary text-primary shadow-sm'
                    : 'bg-transparent border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                📦 Shop Direct Delivery
              </button>
            </div>
          </div>

          {/* Split cost breakdown */}
          <div className="border-t border-border/60 pt-2 space-y-1 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Materials Subtotal</span>
              <span>₹{cartTotal.toLocaleString('en-IN')}</span>
            </div>
            {deliveryMethod === 'Delivery' && (
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery Charge</span>
                <span>₹{deliveryCharge.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-foreground border-t border-dashed border-border pt-1.5 mt-1">
              <span>Material Total Cost</span>
              <span className="text-primary">₹{(cartTotal + deliveryCharge).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Compare Modal/Dialog Layer */}
      {showCompare && compareList.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-card-hover flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/40">
              <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                <ArrowLeftRight className="w-4 h-4 text-primary" /> Product Comparison
              </h4>
              <button
                type="button"
                onClick={() => setShowCompare(false)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 pr-4 font-bold text-[10px] uppercase">Attribute</th>
                    {compareList.map(p => (
                      <th key={p.id} className="py-2 px-3 font-semibold text-foreground text-center">
                        <span className="text-xl block">{p.image}</span>
                        <span className="block mt-1 font-bold">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{p.brandName}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr>
                    <td className="py-2.5 pr-4 font-semibold text-muted-foreground">Price (Final)</td>
                    {compareList.map(p => (
                      <td key={p.id} className="py-2.5 px-3 text-center font-bold text-primary">
                        ₹{p.finalPrice}
                        {p.discount > 0 && <span className="text-[10px] text-muted-foreground font-normal block">Strikethrough: ₹{p.price} (-{p.discount}%)</span>}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-semibold text-muted-foreground">Warranty</td>
                    {compareList.map(p => (
                      <td key={p.id} className="py-2.5 px-3 text-center text-foreground font-medium">{p.warranty}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-semibold text-muted-foreground">Partner Shop</td>
                    {compareList.map(p => (
                      <td key={p.id} className="py-2.5 px-3 text-center text-foreground">
                        <div className="font-semibold">{p.shop.name}</div>
                        <div className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                          <Star className="w-3.5 h-3.5 text-warning fill-warning" /> {p.shop.rating}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-semibold text-muted-foreground">Proximity (Distance)</td>
                    {compareList.map(p => (
                      <td key={p.id} className="py-2.5 px-3 text-center text-foreground font-mono">{p.distance} km away</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-semibold text-muted-foreground">Delivery Charge</td>
                    {compareList.map(p => (
                      <td key={p.id} className="py-2.5 px-3 text-center text-foreground font-medium">
                        {p.deliveryCharge > 0 ? `₹${p.deliveryCharge}` : 'Free'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-semibold text-muted-foreground">Estimated Delivery</td>
                    {compareList.map(p => (
                      <td key={p.id} className="py-2.5 px-3 text-center text-foreground font-mono">~{p.estimatedDeliveryHours} hours</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-semibold text-muted-foreground">Selection</td>
                    {compareList.map(p => {
                      const inCart = cart[p.productId];
                      return (
                        <td key={p.id} className="py-2.5 px-3 text-center">
                          {inCart ? (
                            <span className="text-xs text-success font-semibold flex items-center justify-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Added to cart
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                handleAddToCart(p);
                                setShowCompare(false);
                              }}
                              className="gradient-primary text-primary-foreground px-3 py-1.5 rounded-lg font-bold text-[10px]"
                            >
                              Choose This
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
