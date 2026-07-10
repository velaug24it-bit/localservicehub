import { useState } from 'react';
import { Provider } from '@/data/providers';
import { Booking, useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import SmartPricingDisplay from '@/components/SmartPricingDisplay';
import { api } from '@/lib/api';

interface BookingModalProps {
  provider: Provider;
  onClose: () => void;
  onConfirm: (booking: Booking) => void;
}

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

// Helper to load Razorpay Script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function BookingModal({ provider, onClose, onConfirm }: BookingModalProps) {
  const { user, addBooking } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [serviceType, setServiceType] = useState('Emergency Repair');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('9:00 AM');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [dynamicPrice, setDynamicPrice] = useState<number | null>(null);

  // Mock payment details
  const [mockPaying, setMockPaying] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const times = ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'];

  // Extract base price from provider price range
  const basePrice = (() => {
    const nums = provider.priceRange.match(/\d+/g);
    return nums ? parseInt(nums[0]) : 500;
  })();

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast({ title: 'Please select a date', variant: 'destructive' });
      return;
    }
    if (!phone || phone.trim().length < 10) {
      toast({ title: 'Please enter a valid phone number', variant: 'destructive' });
      return;
    }
    setStep(2);
  };

  const handleRazorpayPayment = async () => {
    setLoading(true);
    try {
      // 1. Load Razorpay SDK Script
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast({ title: 'Razorpay SDK failed to load', description: 'Are you connected to the internet?', variant: 'destructive' });
        setLoading(false);
        return;
      }

      // 2. Create Order in backend (₹50 advance)
      const order = await api.payments.createOrder(50);

      // 3. Check if mock mode is returned (when RAZORPAY_KEY_ID is missing)
      if (order.mock) {
        setMockPaying(true);
        setTimeout(async () => {
          try {
            await submitBooking({
              advanceTransactionId: order.id
            });
          } catch (err) {
            toast({ title: 'Booking failed', description: getErrorMessage(err, 'Failed to complete booking'), variant: 'destructive' });
            setMockPaying(false);
            setLoading(false);
          }
        }, 1500);
        return;
      }

      // 4. Open Real Razorpay Checkout
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'ServiceHub',
        description: '₹50 Booking Advance Payment',
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
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: phone
        },
        theme: {
          color: '#6366f1'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
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
      const finalPrice = dynamicPrice || basePrice;
      const booking = await addBooking({
        providerId: String(provider.id),
        providerName: provider.name,
        serviceType,
        category: provider.category,
        date,
        time,
        description,
        phone,
        location: user?.location || provider.location,
        price: `₹${finalPrice}`,
        customerName: user?.name || '',
        customerEmail: user?.email || '',
        ...paymentData
      });
      onConfirm(booking);
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-card rounded-2xl shadow-card-hover max-w-md w-full mx-4 animate-slide-up overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="gradient-primary p-5 text-primary-foreground">
            <h3 className="text-lg font-display font-bold">Platform Fee</h3>
            <p className="text-sm text-primary-foreground/70">Pay ₹50 platform fee to confirm your request</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-success/5 border border-success/20 rounded-xl p-4 text-center space-y-3">
              <span className="text-lg block">💳</span>
              <span className="text-xs font-bold uppercase tracking-wide text-success block">Razorpay Secure Checkout</span>
              <p className="text-sm text-foreground px-2">
                You are paying a secure <strong>₹50 platform fee</strong>. This fee goes to the website and the full service amount will be paid directly to the provider upon completion.
              </p>
            </div>

            {mockPaying && (
              <div className="flex flex-col items-center justify-center py-4 space-y-2 bg-muted/50 rounded-lg">
                <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground font-medium animate-pulse">Processing mock sandbox payment...</span>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setStep(1)} 
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button 
                  type="button" 
                  disabled={loading}
                  onClick={handleRazorpayPayment}
                  className="flex-1 gradient-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && !mockPaying && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
                  Pay ₹50
                </button>
              </div>
              <button 
                type="button" 
                disabled={loading}
                onClick={async () => {
                  try {
                    await submitBooking({ advanceTransactionId: 'PAY_LATER' });
                  } catch (err) {
                    toast({ title: 'Booking failed', description: getErrorMessage(err, 'Failed to complete booking'), variant: 'destructive' });
                  }
                }}
                className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors text-center font-medium"
              >
                Skip & Pay Later (Temporary Test Option)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-card-hover max-w-md w-full mx-4 animate-slide-up overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="gradient-primary p-5 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-display font-bold">Book {provider.name}</h3>
              <p className="text-sm text-primary-foreground/70">{provider.avatar} {provider.category}</p>
            </div>
            {provider.verified && (
              <span className="flex items-center gap-1 text-xs bg-primary-foreground/20 px-2 py-1 rounded-full">
                <span className="text-success">✓</span> Verified
              </span>
            )}
          </div>
        </div>
        <form onSubmit={handleNextStep} className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Service Type</label>
            <select value={serviceType} onChange={e => setServiceType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none">
              {['Emergency Repair', 'Installation', 'Maintenance', 'Consultation'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Date</label>
              <input type="date" min={today} value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Time</label>
              <select value={time} onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none">
                {times.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Smart Pricing Engine */}
          {date && (
            <SmartPricingDisplay
              category={provider.category}
              location={user?.location || provider.location}
              serviceType={serviceType}
              basePrice={basePrice}
              date={date}
              time={time}
              onPriceCalculated={setDynamicPrice}
            />
          )}

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Description</label>
            <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue..."
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Phone Number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit phone number"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit"
              className="flex-1 gradient-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2">
              Continue to Pay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
