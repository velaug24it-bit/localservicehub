import { Booking, useAuth } from '@/contexts/AuthContext';
import { trackingSteps } from '@/data/providers';
import { useState, useEffect } from 'react';
import LiveGPSTrackingModal from './LiveGPSTrackingModal';
import ContactModal from './ContactModal';
import BookingChatModal from './chat/BookingChatModal';
import { providers, Provider } from '@/data/providers';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface MyBookingsModalProps {
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  Confirmed: 'bg-warning/10 text-warning',
  'En Route': 'bg-info/10 text-info',
  'In Progress': 'bg-secondary/10 text-secondary',
  Completed: 'bg-success/10 text-success',
  Cancelled: 'bg-destructive/10 text-destructive',
};

const downloadInvoiceFile = (invoiceType: 'provider' | 'material' | 'servicehub', booking: any) => {
  const isMaterial = invoiceType === 'material';
  const isProvider = invoiceType === 'provider';
  const isSH = invoiceType === 'servicehub';

  let title = '';
  let fromInfo = '';
  let itemsHtml = '';
  let summaryHtml = '';

  if (isProvider) {
    title = 'Provider Service Labour Invoice';
    fromInfo = `
      <strong>Provider Name:</strong> ${booking.providerName}<br/>
      <strong>Service Category:</strong> ${booking.category}<br/>
      <strong>Service Type:</strong> ${booking.serviceType}<br/>
    `;
    const labourVal = booking.priceBreakdown?.subtotal || 500;
    itemsHtml = `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">Service Labour charges (Completed by ${booking.providerName})</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">1</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${labourVal}</td>
      </tr>
    `;
    summaryHtml = `
      <div style="text-align: right; margin-top: 20px;">
        <p><strong>Labour Subtotal:</strong> ₹${labourVal}</p>
        <p style="font-size: 16px; color: #4f46e5;"><strong>Total Payable to Provider:</strong> ₹${labourVal}</p>
      </div>
    `;
  } else if (isMaterial) {
    title = 'Materials Marketplace Invoice';
    const shopName = booking.marketplaceOrder?.shopName || 'Partner Shop';
    const shopAddress = booking.marketplaceOrder?.shopId?.address || 'Verified Partner Shop Location';
    fromInfo = `
      <strong>Seller:</strong> ${shopName}<br/>
      <strong>Address:</strong> ${shopAddress}<br/>
      <strong>Method:</strong> Hand-arranged via ServiceHub Marketplace (${booking.deliveryMethod})<br/>
    `;
    
    const items = booking.materialsList || booking.marketplaceOrder?.products || [];
    itemsHtml = items.map((item: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.brandName} - ${item.productName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${item.finalUnitPrice || item.price}</td>
      </tr>
    `).join('');

    const sub = booking.materialsTotal || booking.marketplaceOrder?.grandTotal || 0;
    const delivery = booking.deliveryMethod === 'Delivery' ? (booking.marketplaceOrder?.deliveryCharge || 0) : 0;
    summaryHtml = `
      <div style="text-align: right; margin-top: 20px;">
        <p><strong>Materials Subtotal:</strong> ₹${sub - delivery}</p>
        ${delivery > 0 ? `<p><strong>Delivery Charge:</strong> ₹${delivery}</p>` : ''}
        <p style="font-size: 16px; color: #4f46e5;"><strong>Grand Total:</strong> ₹${sub}</p>
      </div>
    `;
  } else if (isSH) {
    title = 'ServiceHub Platform Charges Invoice';
    fromInfo = `
      <strong>Platform Provider:</strong> ServiceHub Connect Private Ltd.<br/>
      <strong>Service Location:</strong> ${booking.location}<br/>
      <strong>Booking Tracking ID:</strong> ${booking.trackingId}<br/>
    `;
    itemsHtml = `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">Platform Booking Fee</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">1</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹50</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">Platform Service Commission</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">1</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹0</td>
      </tr>
    `;
    summaryHtml = `
      <div style="text-align: right; margin-top: 20px;">
        <p><strong>Subtotal:</strong> ₹50</p>
        <p><strong>Taxes & GST (0%):</strong> ₹0</p>
        <p style="font-size: 16px; color: #4f46e5;"><strong>Total ServiceHub Charges:</strong> ₹50</p>
      </div>
    `;
  }

  const invoiceHtml = `
    <html>
    <head>
      <title>Invoice - ${booking.trackingId}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 40px; }
        .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .15); border-radius: 10px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; }
        .logo { font-size: 24px; font-weight: bold; color: #6366f1; }
        .details-table { width: 100%; margin-top: 20px; text-align: left; border-collapse: collapse; }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <div class="header">
          <div class="logo">ServiceHub</div>
          <div>
            <h2 style="margin: 0; color: #111827;">${title}</h2>
            <p style="margin: 5px 0 0 0; font-size: 12px; text-align: right; color: #6b7280;">Date: ${booking.date}</p>
          </div>
        </div>
        <div style="margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 13px; line-height: 1.6;">
          <div>
            <h4 style="margin: 0 0 10px 0; color: #4f46e5; text-transform: uppercase; font-size: 11px;">Billing Details</h4>
            ${fromInfo}
          </div>
          <div>
            <h4 style="margin: 0 0 10px 0; color: #4f46e5; text-transform: uppercase; font-size: 11px;">Customer Info</h4>
            <strong>Name:</strong> ${booking.customerName || 'ServiceHub User'}<br/>
            <strong>Email:</strong> ${booking.customerEmail || ''}<br/>
            <strong>Location:</strong> ${booking.location}<br/>
          </div>
        </div>
        <table class="details-table" style="font-size: 13px;">
          <thead>
            <tr style="background: #f9fafb; color: #4b5563;">
              <th style="padding: 12px;">Description</th>
              <th style="padding: 12px; text-align: right; width: 80px;">Qty</th>
              <th style="padding: 12px; text-align: right; width: 100px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        ${summaryHtml}
        <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; font-size: 11px; color: #9ca3af; text-align: center;">
          Thank you for choosing ServiceHub. This is a computer generated invoice and does not require signature.
        </div>
      </div>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  const blob = new Blob([invoiceHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Invoice_${invoiceType.toUpperCase()}_${booking.trackingId}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export default function MyBookingsModal({ onClose }: MyBookingsModalProps) {
  const { user, bookings, cancelBooking, refreshBookings } = useAuth();
  const [trackingBooking, setTrackingBooking] = useState<Booking | null>(null);
  const [contactBooking, setContactBooking] = useState<Booking | null>(null);
  const [contactProvider, setContactProvider] = useState<Provider | null>(null);
  const [providerUpis, setProviderUpis] = useState<Record<string, string>>({});
  const [rating, setRating] = useState<Record<string, number>>({});
  const [comment, setComment] = useState<Record<string, string>>({});
  const [reviewedBookings, setReviewedBookings] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('servicehub_reviewed_bookings');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const submitReview = async (bookingId: string) => {
    const stars = rating[bookingId] || 5;
    const text = comment[bookingId] || '';
    try {
      await api.reviews.submit({ bookingId, rating: stars, comment: text });
      toast({ title: 'Review Submitted', description: 'Thank you for your feedback!' });
      setReviewedBookings(prev => {
        const next = { ...prev, [bookingId]: true };
        localStorage.setItem('servicehub_reviewed_bookings', JSON.stringify(next));
        return next;
      });
      // Trigger a refresh so the list pulls updated data
      await refreshBookings();
    } catch (err: any) {
      toast({ title: 'Failed to submit review', description: err.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    const loadProviderUpis = async () => {
      const unpaidCompleted = bookings.filter(b => b.status === 'Completed' && (b as any).paymentStatus !== 'Paid');
      const upiMap: Record<string, string> = { ...providerUpis };
      let changed = false;
      for (const b of unpaidCompleted) {
        if (!upiMap[b.providerId]) {
          if ((b as any).providerUpiId) {
            upiMap[b.providerId] = (b as any).providerUpiId;
            changed = true;
          } else {
            try {
              const data = await api.providers.get(b.providerId);
              if (data && data.upiId) {
                upiMap[b.providerId] = data.upiId;
                changed = true;
              }
            } catch (err) {
              console.warn('Failed to load upiId:', b.providerId, err);
            }
          }
        }
      }
      if (changed) {
        setProviderUpis(upiMap);
      }
    };
    if (bookings.length > 0) {
      loadProviderUpis();
    }
  }, [bookings]);

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

  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const [activeChatBooking, setActiveChatBooking] = useState<Booking | null>(null);

  const handleRazorpayPayBooking = async (b: Booking) => {
    setPayingBookingId(b.id);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast({ title: 'Razorpay SDK failed to load', description: 'Are you connected to the internet?', variant: 'destructive' });
        setPayingBookingId(null);
        return;
      }

      const pb = (b as any).priceBreakdown;
      const sub = pb?.subtotal || parseInt(String(b.price).replace(/\D/g, '')) || 500;
      const mat = (b as any).materialsTotal || 0;
      const amountToPay = pb?.grandTotal || (sub + mat);

      const order = await api.payments.createOrder(amountToPay);

      if (order.mock) {
        setTimeout(async () => {
          try {
            await api.bookings.pay(b.id, { advanceTransactionId: order.id });
            toast({ title: 'Payment Successful', description: `Paid ₹${amountToPay} online to ServiceHub website.` });
            await refreshBookings();
          } catch (err: any) {
            toast({ title: 'Payment failed', description: err.message, variant: 'destructive' });
          } finally {
            setPayingBookingId(null);
          }
        }, 1200);
        return;
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'ServiceHub',
        description: `Online Service Payment for Booking #${b.trackingId}`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            await api.bookings.pay(b.id, {
              razorpayOrderId: order.id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });
            toast({ title: 'Payment Successful', description: `Paid ₹${amountToPay} online to ServiceHub website.` });
            await refreshBookings();
          } catch (err: any) {
            toast({ title: 'Payment verification failed', description: err.message, variant: 'destructive' });
          } finally {
            setPayingBookingId(null);
          }
        },
        prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
        theme: { color: '#6366f1' }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        toast({ title: 'Payment Failed', description: resp.error?.description || 'Declined', variant: 'destructive' });
        setPayingBookingId(null);
      });
      rzp.open();
    } catch (err: any) {
      toast({ title: 'Payment initiation failed', description: err.message, variant: 'destructive' });
      setPayingBookingId(null);
    }
  };

  const handleMarkAsPaid = async (bookingId: string) => {
    try {
      await api.bookings.pay(bookingId);
      toast({ title: 'Payment Confirmed', description: 'The booking has been marked as Paid.' });
      await refreshBookings();
    } catch (err: any) {
      toast({ title: 'Failed to confirm payment', description: err.message, variant: 'destructive' });
    }
  };

  const openContact = async (b: Booking) => {
    // Try static providers first
    let provider = providers.find(p => p.id === b.providerId) || null;
    if (!provider) {
      // Fetch from DB profiles (provider created via signup)
      try {
        const data = await api.providers.get(b.providerId);
        provider = {
          id: b.providerId,
          name: data?.name || b.providerName,
          category: b.category,
          avatar: '👷',
          rating: 4.5,
          reviews: 0,
          services: [b.serviceType],
          priceRange: b.price,
          verified: true,
          location: data?.location || b.location,
          experience: 'Verified Provider',
          description: '',
          phone: data?.phone || 'Contact unavailable',
          email: '',
        };
      } catch (err) {
        console.error('Failed to fetch provider details:', err);
      }
    }
    setContactProvider(provider);
    setContactBooking(b);
  };

  if (trackingBooking) {
    return <LiveGPSTrackingModal booking={trackingBooking} onClose={() => setTrackingBooking(null)} />;
  }
  if (activeChatBooking) {
    return (
      <BookingChatModal
        bookingId={activeChatBooking.id || activeChatBooking.trackingId}
        onClose={() => setActiveChatBooking(null)}
      />
    );
  }
  if (contactBooking && contactProvider) {
    return <ContactModal provider={contactProvider} booking={contactBooking} onClose={() => { setContactBooking(null); setContactProvider(null); }} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-card-hover max-w-2xl w-full mx-4 animate-slide-up overflow-hidden max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="gradient-primary p-5 text-primary-foreground flex items-center justify-between">
          <h3 className="text-lg font-display font-bold">My Bookings</h3>
          <button onClick={onClose} className="text-primary-foreground/70 hover:text-primary-foreground text-xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {bookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-3">📋</div>
              <p>No bookings yet</p>
            </div>
          ) : bookings.map(b => {
            const steps = trackingSteps[b.category] || trackingSteps.plumbing;
            const progress = b.status === 'Cancelled' ? 0 : ((b.currentStep + 1) / steps.length) * 100;
            const activeUpi = (b as any).providerUpiId || providerUpis[b.providerId] || '';
            return (
              <div key={b.id} className="border border-border rounded-xl p-4 hover:shadow-card transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-foreground">{b.providerName}</div>
                    <div className="text-xs text-muted-foreground">ID: {b.trackingId}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.status !== 'Cancelled' && b.status !== 'Completed' && (
                      <span className="w-2 h-2 rounded-full bg-destructive animate-pulse-dot" />
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[b.status] || 'bg-muted text-foreground'}`}>
                      {b.status}
                    </span>
                  </div>
                </div>
                {b.status !== 'Cancelled' && (
                  <div className="mb-3">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full gradient-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{steps[b.currentStep]?.name || 'Completed'}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
                  <div><span className="text-muted-foreground">Service:</span> <span className="text-foreground font-medium">{b.serviceType}</span></div>
                  <div><span className="text-muted-foreground">Date:</span> <span className="text-foreground font-medium">{b.date}</span></div>
                  <div><span className="text-muted-foreground">Time:</span> <span className="text-foreground font-medium">{b.time}</span></div>
                  <div><span className="text-muted-foreground">Price:</span> <span className="text-foreground font-medium">{b.price}</span></div>
                </div>

                {/* Marketplace materials details if requested */}
                {b.materialsRequired && (
                  <div className="mt-3 p-3 bg-muted/30 border border-border rounded-xl space-y-2 text-xs">
                    <span className="font-bold text-foreground inline-flex items-center gap-1.5">
                      📦 Marketplace Materials ({b.materialsList?.length || 0} item{b.materialsList?.length > 1 ? 's' : ''})
                    </span>
                    <div className="divide-y divide-border/40">
                      {b.materialsList?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between py-1 text-[11px]">
                          <span className="text-muted-foreground">{item.brandName} · {item.productName} (x{item.quantity})</span>
                          <span className="font-medium text-foreground">₹{item.subtotal}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-1 font-semibold text-[11px] border-t border-dashed border-border mt-1">
                        <span className="text-muted-foreground">Fulfillment Method ({b.deliveryMethod})</span>
                        <span className="text-primary">Total: ₹{b.materialsTotal}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Separated Invoice Download */}
                <div className="mt-3 p-3 border border-border bg-card rounded-xl space-y-2">
                  <span className="text-xs font-bold text-muted-foreground block uppercase tracking-wider text-[10px]">Download Split Invoices</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => downloadInvoiceFile('provider', b)}
                      className="px-2.5 py-1 text-[11px] font-semibold border border-border rounded-lg bg-card hover:bg-muted text-foreground transition-all"
                    >
                      📄 Labour Bill
                    </button>
                    {b.materialsRequired && b.materialsTotal > 0 && (
                      <button
                        type="button"
                        onClick={() => downloadInvoiceFile('material', b)}
                        className="px-2.5 py-1 text-[11px] font-semibold border border-border rounded-lg bg-card hover:bg-muted text-foreground transition-all"
                      >
                        📦 Materials Bill
                      </button>
                    )}
                  </div>
                </div>
                {b.status === 'Completed' && (
                  <div className="mt-3 p-4 bg-success/5 border border-success/15 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase text-success tracking-wider">Service Completed — Payment Due</span>
                      {(b as any).paymentStatus === 'Paid' ? (
                        <span className="text-xs font-bold text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">✓ PAID ONLINE</span>
                      ) : (
                        <span className="text-xs font-bold text-destructive bg-destructive/10 px-2.5 py-1 rounded-full border border-destructive/20 animate-pulse">⌛ UNPAID</span>
                      )}
                    </div>
                    
                    {(b as any).paymentStatus !== 'Paid' ? (
                      <div className="p-4 bg-card border border-border rounded-xl space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-foreground text-sm block">Complete Service Payment</span>
                            <span className="text-xs text-muted-foreground">Work completed by {b.providerName}. Pay online via Razorpay to website.</span>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-extrabold text-primary block">
                              ₹{((b as any).priceBreakdown?.grandTotal || (((b as any).priceBreakdown?.subtotal || (parseInt(b.price.replace(/\D/g, '')) || 500)) + (b.materialsTotal || 0))).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Payable</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={payingBookingId === b.id}
                          onClick={() => handleRazorpayPayBooking(b)}
                          className="w-full gradient-primary text-primary-foreground py-2.5 rounded-lg font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md"
                        >
                          {payingBookingId === b.id ? (
                            <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          ) : (
                            '💳 Pay Online via Razorpay'
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2 border-t border-success/15">
                        <p className="text-xs text-muted-foreground font-semibold">Payment has been confirmed. Thank you!</p>
                        {reviewedBookings[b.id] || b.review ? (
                          <div className="text-xs text-success font-semibold flex items-center gap-1.5 bg-success/5 p-2 rounded-lg border border-success/10">
                            ⭐ Review Submitted Successfully
                          </div>
                        ) : (
                          <div className="bg-card p-3 rounded-xl border border-border space-y-3">
                            <p className="text-xs font-bold text-foreground">Write a Review for {b.providerName}</p>
                            
                            {/* Rating Stars */}
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(star => (
                                <button
                                  key={star}
                                  onClick={() => setRating(prev => ({ ...prev, [b.id]: star }))}
                                  className="text-lg focus:outline-none transition-transform hover:scale-110"
                                >
                                  {star <= (rating[b.id] || 5) ? '★' : '☆'}
                                </button>
                              ))}
                              <span className="text-xs text-muted-foreground ml-1">({rating[b.id] || 5}/5)</span>
                            </div>

                            {/* Comment */}
                            <textarea
                              placeholder="Share your experience (optional)..."
                              value={comment[b.id] || ''}
                              onChange={(e) => setComment(prev => ({ ...prev, [b.id]: e.target.value }))}
                              className="w-full text-xs p-2 rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary outline-none min-h-[50px] resize-none"
                            />

                            <button
                              onClick={() => submitReview(b.id)}
                              className="w-full py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
                            >
                              Submit Review
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
                  <button 
                    onClick={() => setActiveChatBooking(b)} 
                    className="px-3.5 py-1.5 rounded-xl gradient-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <span>💬 Chat with Provider</span>
                  </button>

                  <a 
                    href="tel:+919840994649"
                    className="px-3 py-1.5 rounded-xl bg-muted border border-border text-foreground text-xs font-semibold hover:bg-muted/80 transition-colors flex items-center gap-1"
                    title="ServiceHub Support: 9840994649"
                  >
                    <span>📞 Support: 9840994649</span>
                  </a>

                  {b.status !== 'Cancelled' && b.status !== 'Completed' && (
                    <>
                      <button onClick={() => setTrackingBooking(b)} className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors">
                        📋 Track Service
                      </button>
                      <button onClick={async () => { await cancelBooking(b.id); toast({ title: 'Booking cancelled' }); }}
                        className="px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors">
                        ✕ Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
