import { Booking, useAuth } from '@/contexts/AuthContext';
import { trackingSteps } from '@/data/providers';
import { useState, useEffect } from 'react';
import LiveGPSTrackingModal from './LiveGPSTrackingModal';
import ContactModal from './ContactModal';
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

export default function MyBookingsModal({ onClose }: MyBookingsModalProps) {
  const { bookings, cancelBooking, refreshBookings } = useAuth();
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
                {b.status === 'Completed' && (
                  <div className="mt-3 p-4 bg-success/5 border border-success/15 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase text-success tracking-wider">Service Completed Payment</span>
                      {(b as any).paymentStatus === 'Paid' ? (
                        <span className="text-xs font-bold text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">✓ PAID</span>
                      ) : (
                        <span className="text-xs font-bold text-destructive bg-destructive/10 px-2.5 py-1 rounded-full border border-destructive/20">⌛ UNPAID</span>
                      )}
                    </div>
                    
                    {(b as any).paymentStatus !== 'Paid' ? (
                      activeUpi ? (
                        <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-3 rounded-lg border border-border">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=upi%3A%2F%2Fpay%3Fpa%3D${encodeURIComponent(activeUpi)}%26pn%3D${encodeURIComponent(b.providerName)}%26am%3D${b.price.replace(/\D/g, '')}%26cu%3DINR`} 
                            alt="Provider QR Code" 
                            className="w-28 h-28 border border-border rounded-md bg-white p-1"
                          />
                          <div className="text-center sm:text-left space-y-1.5 flex-1">
                            <p className="text-xs text-muted-foreground">Scan QR code using GPay, PhonePe, Paytm, or any UPI App to pay provider directly.</p>
                            <div className="text-xs">
                              <span className="font-semibold text-foreground">UPI ID:</span> <code className="bg-muted px-1.5 py-0.5 rounded text-primary">{activeUpi}</code>
                            </div>
                            <button 
                              onClick={() => handleMarkAsPaid(b.id)}
                              className="mt-2 w-full sm:w-auto px-4 py-2 bg-success text-success-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 animate-pulse"
                            >
                              💳 Mark as Paid
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-warning/5 border border-warning/20 rounded-lg text-center space-y-2">
                          <p className="text-xs text-warning font-semibold">⚠️ Provider has not configured their UPI ID yet.</p>
                          <p className="text-[10px] text-muted-foreground">Please ask the provider to set their UPI ID in their profile tab or confirm offline payment manually.</p>
                          <button 
                            onClick={() => handleMarkAsPaid(b.id)}
                            className="mx-auto px-4 py-1.5 bg-success text-success-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                          >
                            Mark as Paid Manually
                          </button>
                        </div>
                      )
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
                <div className="flex flex-wrap gap-2">
                  {b.status !== 'Cancelled' && b.status !== 'Completed' && (
                    <>
                      <button onClick={() => setTrackingBooking(b)} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                        📋 Track Service
                      </button>
                      <button onClick={() => openContact(b)} className="px-3 py-1.5 rounded-lg bg-info/10 text-info text-xs font-medium hover:bg-info/20 transition-colors">
                        💬 Contact
                      </button>
                      <button onClick={async () => { await cancelBooking(b.id); toast({ title: 'Booking cancelled' }); }}
                        className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors">
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
