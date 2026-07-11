import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { X, Star } from 'lucide-react';

interface ReviewItem {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  serviceType: string;
  createdAt: string;
}

interface ProviderReviewsModalProps {
  providerId: string;
  providerName: string;
  onClose: () => void;
}

export default function ProviderReviewsModal({ providerId, providerName, onClose }: ProviderReviewsModalProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await api.reviews.listForProvider(providerId);
        if (data) {
          setReviews(data.reviews || []);
          setAvgRating(data.avgRating || 0);
          setTotalReviews(data.totalReviews || 0);
        }
      } catch (err) {
        console.error('Failed to load reviews:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [providerId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-card rounded-2xl shadow-card-hover max-w-md w-full overflow-hidden animate-slide-up flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="gradient-primary p-5 text-primary-foreground flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-display font-bold">⭐ Provider Reviews</h3>
            <p className="text-xs text-primary-foreground/80">{providerName}</p>
          </div>
          <button onClick={onClose} className="text-primary-foreground/70 hover:text-primary-foreground text-xl">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="text-center py-10">
              <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-xs text-muted-foreground mt-2">Loading reviews...</p>
            </div>
          ) : (
            <>
              {/* Ratings Summary */}
              <div className="bg-muted/40 border border-border rounded-xl p-4 flex items-center justify-around text-center shrink-0">
                <div>
                  <div className="text-3xl font-bold text-foreground">{avgRating || '4.5'}</div>
                  <div className="flex items-center gap-0.5 justify-center mt-1 text-warning">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star 
                        key={star} 
                        className="w-3.5 h-3.5" 
                        fill={star <= Math.round(avgRating || 4.5) ? 'currentColor' : 'none'} 
                      />
                    ))}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Average Rating</div>
                </div>
                <div className="w-px h-12 bg-border" />
                <div>
                  <div className="text-3xl font-bold text-foreground">{totalReviews}</div>
                  <div className="text-xs font-semibold text-muted-foreground mt-1.5">💬 Reviews</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Total Ratings</div>
                </div>
              </div>

              {/* Review Comments list */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer Feedback</p>
                {reviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
                    <p className="text-xs">No reviews submitted yet.</p>
                    <p className="text-[10px] mt-0.5">Be the first to review after service completion!</p>
                  </div>
                ) : (
                  reviews.map(r => (
                    <div key={r.id} className="border border-border rounded-xl p-3.5 space-y-1.5 hover:shadow-card transition-shadow bg-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-foreground block">{r.customerName}</span>
                          <span className="text-[10px] text-muted-foreground">{r.serviceType}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-warning bg-warning/5 px-2 py-0.5 rounded-full border border-warning/10">
                          <span className="text-xs font-bold">{r.rating}</span>
                          <Star className="w-3 h-3 fill-currentColor" />
                        </div>
                      </div>
                      {r.comment && (
                        <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/40 leading-relaxed italic">
                          "{r.comment}"
                        </p>
                      )}
                      <div className="text-[9px] text-muted-foreground/80 text-right">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 shrink-0">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
