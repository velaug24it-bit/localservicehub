import { useState, useEffect } from 'react';
import { Provider } from '@/data/providers';
import { Booking, useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import SmartPricingDisplay from '@/components/SmartPricingDisplay';
import DynamicServiceSelector, { SelectedServiceItem, PriceBreakdown } from '@/components/DynamicServiceSelector';
import MaterialsMarketplace from './MaterialsMarketplace';
import { api } from '@/lib/api';

interface BookingModalProps {
  provider: Provider;
  onClose: () => void;
  onConfirm: (booking: Booking) => void;
}

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// Step indicator component
function StepBar({ current }: { current: number }) {
  const steps = ['Service & Schedule', 'Materials', 'Checkout'];
  return (
    <div className="flex items-center gap-0 px-5 pt-3 pb-1">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={idx} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-0.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                done ? 'bg-success border-success text-success-foreground' :
                active ? 'bg-primary border-primary text-primary-foreground' :
                'bg-card border-border text-muted-foreground'
              }`}>
                {done ? '✓' : idx}
              </div>
              <span className={`text-[9px] font-semibold whitespace-nowrap ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-1 mb-3 transition-all ${done ? 'bg-success' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function BookingModal({ provider, onClose, onConfirm }: BookingModalProps) {
  const { user, addBooking } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [serviceType, setServiceType] = useState('Emergency Repair');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('9:00 AM');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [dynamicPrice, setDynamicPrice] = useState<number | null>(null);
  const [bookingDistrict, setBookingDistrict] = useState(provider.location || 'Chennai');
  const [bookingAddress, setBookingAddress] = useState(user?.location || '');

  // Dynamic service items
  const [serviceItems, setServiceItems] = useState<SelectedServiceItem[]>([]);
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);

  // Marketplace states
  const [materialsRequired, setMaterialsRequired] = useState<boolean>(false);
  const [materialsList, setMaterialsList] = useState<any[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<'Pickup' | 'Delivery'>('Pickup');
  const [materialsTotal, setMaterialsTotal] = useState<number>(0);
  const [isEmergency, setIsEmergency] = useState<boolean>(false);
  const [useWallet, setUseWallet] = useState<boolean>(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  useEffect(() => {
    if (user) {
      api.customerRetention.getWallet().then(w => {
        setWalletBalance(w?.balance || 0);
      }).catch(() => {});
    }
  }, [user]);

  // Internal materials choice state — separate from the marketplace's own tracking
  // null = not yet chosen, false = has own materials, true = needs marketplace
  const [materialsChoice, setMaterialsChoice] = useState<boolean | null>(null);

  const [mockPaying, setMockPaying] = useState(false);

  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const times = ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'];

  const basePrice = (() => {
    const nums = provider.priceRange.match(/\d+/g);
    return nums ? parseInt(nums[0]) : 500;
  })();

  const derivedServiceType = serviceItems.length > 0
    ? (serviceItems.length === 1
        ? `${serviceItems[0].serviceItemName} – ${serviceItems[0].workTypeName}`
        : `Multiple Services (${serviceItems.length} items)`)
    : serviceType;

  const labourSubtotal = priceBreakdown?.subtotal || 0;
  const emergencySurcharge = isEmergency ? 150 : 0;
  const subtotalBeforeWallet = labourSubtotal + (materialsRequired ? materialsTotal : 0) + emergencySurcharge;
  const walletDiscount = useWallet ? Math.min(walletBalance, subtotalBeforeWallet) : 0;
  const paymentAmount = Math.max(0, subtotalBeforeWallet - walletDiscount);
  const fullOrderTotal = paymentAmount;

  // ── Step 1 Validation ──────────────────────────────────────────────
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast({ title: 'Please select a date', variant: 'destructive' });
      return;
    }

    const now = new Date();
    const localTodayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    if (date < localTodayStr) {
      toast({ title: 'Invalid Date', description: 'You cannot book a date in the past.', variant: 'destructive' });
      return;
    }

    const parseTimeTo24h = (timeStr: string) => {
      const [timePart, ampm] = timeStr.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const selectedMinutes = parseTimeTo24h(time);

    if (date === localTodayStr) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (selectedMinutes < currentMinutes) {
        toast({ title: 'Invalid Time', description: 'You cannot book a slot in the past.', variant: 'destructive' });
        return;
      }
    }

    const selectedDateObj = new Date(date);
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = daysOfWeek[selectedDateObj.getDay()];

    const providerAvail = provider.availability || {
      Monday: { start: '09:00', end: '18:00', enabled: true },
      Tuesday: { start: '09:00', end: '18:00', enabled: true },
      Wednesday: { start: '09:00', end: '18:00', enabled: true },
      Thursday: { start: '09:00', end: '18:00', enabled: true },
      Friday: { start: '09:00', end: '18:00', enabled: true },
      Saturday: { start: '09:00', end: '18:00', enabled: true },
      Sunday: { start: '09:00', end: '18:00', enabled: false }
    };

    const dayConfig = providerAvail[dayName];
    if (!dayConfig || !dayConfig.enabled) {
      toast({ title: 'Provider Unavailable', description: `${provider.name} is not available on ${dayName}s.`, variant: 'destructive' });
      return;
    }

    const parse24hToMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const startMinutes = parse24hToMinutes(dayConfig.start);
    const endMinutes = parse24hToMinutes(dayConfig.end);

    if (selectedMinutes < startMinutes || selectedMinutes > endMinutes) {
      toast({ title: 'Outside Working Hours', description: `${provider.name} is only available between ${dayConfig.start} and ${dayConfig.end} on ${dayName}s.`, variant: 'destructive' });
      return;
    }

    if (!bookingAddress || bookingAddress.trim().length === 0) {
      toast({ title: 'Please enter your service address', variant: 'destructive' });
      return;
    }

    if (!phone || phone.trim().length < 10) {
      toast({ title: 'Please enter a valid phone number', variant: 'destructive' });
      return;
    }

    // Reset materials state when going back to step 2
    setMaterialsChoice(null);
    setMaterialsRequired(false);
    setMaterialsList([]);
    setShopId(null);
    setMaterialsTotal(0);
    setStep(2);
  };

  // ── Step 2 Proceed ────────────────────────────────────────────────
  const handleProceedFromMaterials = () => {
    if (materialsChoice === null) {
      toast({ title: 'Please make a selection', description: 'Choose whether materials are needed for this service.', variant: 'destructive' });
      return;
    }
    if (materialsChoice === true && !shopId) {
      toast({ title: 'Select at least one product', description: 'Add products from the marketplace or choose "I already have materials".', variant: 'destructive' });
      return;
    }
    setStep(3);
  };

  // ── Payment ───────────────────────────────────────────────────────
  const handleRazorpayPayment = async () => {
    setLoading(true);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast({ title: 'Razorpay SDK failed to load', description: 'Are you connected to the internet?', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const order = await api.payments.createOrder(paymentAmount);

      if (order.mock) {
        setMockPaying(true);
        setTimeout(async () => {
          try {
            await submitBooking({ advanceTransactionId: order.id });
          } catch (err) {
            toast({ title: 'Booking failed', description: getErrorMessage(err, 'Failed to complete booking'), variant: 'destructive' });
            setMockPaying(false);
            setLoading(false);
          }
        }, 1500);
        return;
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'ServiceHub',
        description: materialsRequired ? 'Service Labour + Materials Total Payment' : 'Full Service Booking Payment to Website',
        order_id: order.id,
        handler: async (response: any) => {
          try {
            await submitBooking({
              razorpayOrderId: order.id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });
          } catch (err) {
            toast({ title: 'Payment validation failed', description: getErrorMessage(err, 'Booking could not be finalized.'), variant: 'destructive' });
            setLoading(false);
          }
        },
        prefill: { name: user?.name || '', email: user?.email || '', contact: phone },
        theme: { color: '#6366f1' }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        toast({ title: 'Payment Failed', description: resp.error.description || 'Transaction was declined.', variant: 'destructive' });
      });
      rzp.open();
      setLoading(false);
    } catch (err: unknown) {
      toast({ title: 'Payment initiation failed', description: getErrorMessage(err, 'Please try again later.'), variant: 'destructive' });
      setLoading(false);
    }
  };

  const submitBooking = async (paymentData: {
    advanceTransactionId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  }) => {
    setLoading(true);
    try {
      const checkoutBreakdown = {
        subtotal: labourSubtotal,
        bookingFee: 0,
        platformFee: 0,
        taxes: 0,
        materialsTotal: materialsRequired ? materialsTotal : 0,
        grandTotal: paymentAmount,
        providerEarnings: Math.round(labourSubtotal * 0.95),
        platformCommission: Math.round(labourSubtotal * 0.05)
      };

      const booking = await addBooking({
        providerId: String(provider.id),
        providerName: provider.name,
        serviceType: derivedServiceType,
        category: provider.category,
        date,
        time,
        description,
        phone,
        location: `${bookingAddress}, ${bookingDistrict}`,
        price: `₹${paymentAmount}`,
        customerName: user?.name || '',
        customerEmail: user?.email || '',
        serviceItems,
        priceBreakdown: checkoutBreakdown,
        materialsRequired,
        materialsTotal: materialsRequired ? materialsTotal : 0,
        materialsList: materialsRequired ? materialsList : [],
        shopId: materialsRequired ? shopId : null,
        deliveryMethod: materialsRequired ? deliveryMethod : 'Pickup',
        ...paymentData
      });
      onConfirm(booking);
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // STEP 2 — Materials Requirement
  // ══════════════════════════════════════════════════════════════════
  if (step === 2) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm" onClick={onClose}>
        <div
          className="bg-card rounded-2xl shadow-card-hover max-w-lg w-full mx-4 animate-slide-up overflow-hidden max-h-[95vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="gradient-primary p-5 text-primary-foreground">
            <h3 className="text-lg font-display font-bold">Book {provider.name}</h3>
            <p className="text-sm text-primary-foreground/70">{provider.avatar} {provider.category}</p>
          </div>

          {/* Step Progress Bar */}
          <StepBar current={2} />

          {/* Step 2 Content */}
          <div className="p-5 flex-1 overflow-y-auto space-y-4">

            {/* --- CHOICE: no selection made yet --- */}
            {materialsChoice === null && (
              <div className="space-y-3">
                <div className="bg-muted/30 border border-border rounded-xl p-3">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-0.5">Step 2 of 3 — Material Requirement</p>
                  <p className="text-sm text-muted-foreground">Does this service require any parts or materials?</p>
                </div>

                {/* Option A */}
                <button
                  type="button"
                  onClick={() => {
                    setMaterialsChoice(false);
                    setMaterialsRequired(false);
                    setMaterialsList([]);
                    setShopId(null);
                    setMaterialsTotal(0);
                  }}
                  className="w-full flex items-start gap-3 px-4 py-4 rounded-xl border-2 border-border bg-card hover:border-muted-foreground/40 hover:bg-muted/30 text-left transition-all active:scale-[0.99] group"
                >
                  <div className="mt-0.5 w-5 h-5 rounded-full border-2 border-border group-hover:border-foreground flex items-center justify-center shrink-0 transition-colors">
                    <div className="w-2.5 h-2.5 rounded-full bg-transparent" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">I already have the required materials</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Provider will visit and perform labour only. No materials purchase needed.</div>
                  </div>
                </button>

                {/* Option B */}
                <button
                  type="button"
                  onClick={() => {
                    setMaterialsChoice(true);
                    setMaterialsRequired(true);
                  }}
                  className="w-full flex items-start gap-3 px-4 py-4 rounded-xl border-2 border-primary/30 bg-primary/[0.03] hover:bg-primary/10 hover:border-primary/60 text-left transition-all active:scale-[0.99] group"
                >
                  <div className="mt-0.5 w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-primary flex items-center gap-2 flex-wrap">
                      Provider should arrange the materials
                      <span className="bg-primary/15 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">🛒 Marketplace</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Browse &amp; purchase certified parts from verified nearby partner stores.</div>
                  </div>
                </button>
              </div>
            )}

            {/* --- CHOICE A: Self materials confirmed --- */}
            {materialsChoice === false && (
              <div className="space-y-3">
                <div className="bg-success/5 border border-success/25 rounded-xl p-4 flex gap-3">
                  <span className="text-success text-xl mt-0.5">✅</span>
                  <div>
                    <span className="font-semibold text-sm block text-foreground">Materials Self-Arranged</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      You will provide the required materials. The provider will only perform the service labour.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMaterialsChoice(null)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  ← Change Selection
                </button>
              </div>
            )}

            {/* --- CHOICE B: Marketplace --- */}
            {materialsChoice === true && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">🛒 ServiceHub Marketplace</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMaterialsChoice(null);
                      setMaterialsRequired(false);
                      setShopId(null);
                      setMaterialsList([]);
                      setMaterialsTotal(0);
                    }}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Change Selection
                  </button>
                </div>
                <MaterialsMarketplace
                  categoryKey={provider.category}
                  serviceItems={serviceItems}
                  userLocation={bookingDistrict}
                  skipChoiceScreen={true}
                  onMaterialsSelected={(data) => {
                    setMaterialsRequired(data.materialsRequired);
                    setMaterialsList(data.materialsList);
                    setShopId(data.shopId);
                    setDeliveryMethod(data.deliveryMethod);
                    setMaterialsTotal(data.materialsTotal);
                  }}
                />
                {/* Show cart total if items added */}
                {shopId && materialsList.length > 0 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Materials Total</span>
                    <span className="text-primary font-bold text-base">₹{materialsTotal.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="p-5 border-t border-border flex gap-3 bg-muted/20">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-2.5 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors active:scale-95"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleProceedFromMaterials}
              disabled={materialsChoice === null}
              className="flex-1 gradient-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:opacity-90 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {materialsChoice === null ? 'Make a Selection First' : 'Continue to Checkout →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // STEP 3 — Checkout / Payment
  // ══════════════════════════════════════════════════════════════════
  if (step === 3) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm" onClick={onClose}>
        <div
          className="bg-card rounded-2xl shadow-card-hover max-w-md w-full mx-4 animate-slide-up overflow-hidden max-h-[92vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="gradient-primary p-5 text-primary-foreground">
            <h3 className="text-lg font-display font-bold">Secure Checkout</h3>
            <p className="text-sm text-primary-foreground/70">Review your order &amp; complete booking</p>
          </div>

          {/* Step Progress Bar */}
          <StepBar current={3} />

          <div className="p-5 space-y-4">

            {/* ── Upfront Payment Banner ── */}
            <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-4 text-center space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Pay Now — {materialsRequired && materialsTotal > 0 ? 'Platform + Materials Fee' : 'Platform Booking Fee'}</p>
              <p className="text-3xl font-extrabold text-primary">₹{paymentAmount.toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-muted-foreground">This secures your booking slot with {provider.name}</p>
            </div>

            {/* ── Full Order Summary (informational) ── */}
            <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm text-xs">
              <div className="bg-muted/40 px-4 py-2.5 border-b border-border font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                Full Order Summary
              </div>
              <div className="divide-y divide-border/60">

                {/* Section 1: Labour — paid after service */}
                <div className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Provider Labour</span>
                    <span className="text-[10px] bg-warning/10 text-warning font-bold px-2 py-0.5 rounded-full">Paid after service ✓</span>
                  </div>
                  <div className="flex justify-between font-semibold text-sm text-foreground">
                    <span>{derivedServiceType}</span>
                    <span>₹{labourSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">💰 You pay ₹{labourSubtotal.toLocaleString('en-IN')} directly to {provider.name} after service is completed</div>
                </div>

                {/* Section 2: Materials — if selected */}
                {materialsRequired && materialsList.length > 0 && (
                  <div className="p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Materials Bill</span>
                      <span className="text-[10px] bg-success/10 text-success font-bold px-2 py-0.5 rounded-full">Paid now ✓</span>
                    </div>
                    {materialsList.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-muted-foreground">
                        <span>{item.brandName} · {item.productName} (×{item.quantity})</span>
                        <span>₹{item.subtotal.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    {deliveryMethod === 'Delivery' && (
                      <div className="flex justify-between text-muted-foreground text-[10px]">
                        <span>Delivery Charge</span>
                        <span>₹{Math.max(...materialsList.map(m => m.deliveryCharge || 0), 0).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t border-dashed border-border pt-1.5 mt-1 text-foreground">
                      <span>Materials Total</span>
                      <span>₹{materialsTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">💳 You pay for materials now; Provider collects from shop on your behalf</div>
                  </div>
                )}

                {/* Section 3: Emergency Dispatch Option */}
                <div className="p-3.5 bg-rose-500/5 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="emergency-toggle"
                      checked={isEmergency}
                      onChange={e => setIsEmergency(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <label htmlFor="emergency-toggle" className="cursor-pointer">
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">🚨 Emergency 30-Min Rapid Dispatch</span>
                      <span className="text-[10px] text-muted-foreground">Priority specialist routing (+ ₹150 surcharge + 180-day double warranty)</span>
                    </label>
                  </div>
                  {isEmergency && <span className="text-xs font-extrabold text-rose-600">+₹150</span>}
                </div>

                {/* Section 4: Customer Wallet Credits */}
                {walletBalance > 0 && (
                  <div className="p-3.5 bg-emerald-500/5 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="wallet-toggle"
                        checked={useWallet}
                        onChange={e => setUseWallet(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <label htmlFor="wallet-toggle" className="cursor-pointer">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">💳 Apply Customer Wallet Credits</span>
                        <span className="text-[10px] text-muted-foreground">Available balance: ₹{walletBalance} (cashback & rewards)</span>
                      </label>
                    </div>
                    {useWallet && <span className="text-xs font-extrabold text-emerald-600">-₹{walletDiscount}</span>}
                  </div>
                )}

                {/* Grand Total summary row */}
                <div className="p-3.5 bg-muted/30">
                  <div className="flex justify-between font-extrabold text-sm text-primary">
                    <span>Total Service Value</span>
                    <span>₹{paymentAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment note */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-primary block">🔒 No Payment Required Right Now</span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Your booking will be confirmed immediately. You will pay <strong>₹{paymentAmount.toLocaleString('en-IN')}</strong> online via Razorpay to ServiceHub website <strong>after {provider.name} completes your service work</strong>.
              </p>
            </div>

            {/* Processing spinner */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-3 space-y-2 bg-muted/50 rounded-lg">
                <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground font-medium animate-pulse">Confirming your booking...</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={loading}
                className="flex-1 py-2.5 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors disabled:opacity-50 active:scale-95"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  try {
                    await submitBooking({ advanceTransactionId: 'PAY_AFTER_COMPLETION' });
                  } catch (err) {
                    toast({ title: 'Booking failed', description: getErrorMessage(err, 'Failed to complete booking'), variant: 'destructive' });
                  }
                }}
                className="flex-[2] gradient-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
              >
                {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
                ✅ Confirm &amp; Place Booking
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // STEP 1 — Service Selection, Date, Time & Phone
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card w-full sm:max-w-lg sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-card-hover animate-slide-up flex flex-col max-h-[95vh] sm:max-h-[92vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="gradient-primary p-4 sm:p-5 text-primary-foreground flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-display font-bold">Book {provider.name}</h3>
              <p className="text-xs sm:text-sm text-primary-foreground/70">{provider.avatar} {provider.category}</p>
            </div>
            {provider.verified && (
              <span className="flex items-center gap-1 text-xs bg-primary-foreground/20 px-2 py-1 rounded-full">
                <span className="text-success">✓</span> Verified
              </span>
            )}
          </div>
        </div>

        {/* Step Bar */}
        <StepBar current={1} />

        <form onSubmit={handleNextStep} className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
          {/* Dynamic Service Selector */}
          <DynamicServiceSelector
            providerId={String(provider.id)}
            categoryKey={provider.category}
            onServiceItemsChange={(items, bd) => {
              setServiceItems(items);
              setPriceBreakdown(bd);
              if (bd) setDynamicPrice(bd.grandTotal);
            }}
          />

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label className="text-xs sm:text-sm font-medium text-foreground mb-1 block">Date</label>
              <input
                type="date"
                min={today}
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-foreground mb-1 block">Time</label>
              <select
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
              >
                {times.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Smart Pricing fallback */}
          {date && serviceItems.length === 0 && (
            <SmartPricingDisplay
              category={provider.category}
              location={bookingDistrict}
              serviceType={serviceType}
              basePrice={basePrice}
              date={date}
              time={time}
              onPriceCalculated={setDynamicPrice}
            />
          )}

          {/* Description */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-foreground mb-1 block">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the issue or service needed..."
              className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none resize-none"
            />
          </div>

          {/* District */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-foreground mb-1 block">District (Tamil Nadu)</label>
            <select
              value={bookingDistrict}
              onChange={e => setBookingDistrict(e.target.value)}
              className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
            >
              {[
                'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore',
                'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram',
                'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai',
                'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai',
                'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi',
                'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli',
                'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur',
                'Vellore', 'Viluppuram', 'Virudhunagar'
              ].map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-foreground mb-1 block">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="10-digit phone number"
              className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          {/* Service Address */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-foreground mb-1 block">Service Address</label>
            <textarea
              rows={2}
              required
              value={bookingAddress}
              onChange={e => setBookingAddress(e.target.value)}
              placeholder="e.g. No. 12, Bazaar Street, Madurai"
              className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 gradient-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              Continue →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
