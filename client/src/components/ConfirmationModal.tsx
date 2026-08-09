import { useState, useEffect } from 'react';
import { Booking } from '@/contexts/AuthContext';
import { MessageSquare, Phone, ShieldCheck, FileText, Sparkles, CheckCircle2, ArrowRight, Eye } from 'lucide-react';
import BookingChatModal from './chat/BookingChatModal';
import AgreementSignModal from './agreements/AgreementSignModal';
import AgreementViewModal from './agreements/AgreementViewModal';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface ConfirmationModalProps {
  booking: Booking;
  onClose: () => void;
  onViewBookings: () => void;
}

export default function ConfirmationModal({ booking, onClose, onViewBookings }: ConfirmationModalProps) {
  const [openChat, setOpenChat] = useState(false);
  const [agreement, setAgreement] = useState<any>(null);
  const [loadingAgreement, setLoadingAgreement] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(booking.trackingId);
  };

  useEffect(() => {
    // Check if an agreement already exists for this booking
    const checkAgreement = async () => {
      try {
        const myAgreements = await api.agreements.getMy();
        const existing = myAgreements.find(
          (a: any) => a.bookingId === (booking.id || (booking as any)._id) || a.trackingId === booking.trackingId
        );
        if (existing) {
          setAgreement(existing);
        }
      } catch (_) {}
    };
    checkAgreement();
  }, [booking]);

  const handleOpenSignAgreement = async () => {
    if (agreement) {
      if (agreement.status === 'ACTIVE') {
        setShowViewModal(true);
      } else {
        setShowSignModal(true);
      }
      return;
    }

    try {
      setLoadingAgreement(true);
      const res = await api.agreements.create({
        bookingId: booking.id || (booking as any)._id || booking.trackingId
      });
      setAgreement(res);
      setShowSignModal(true);
    } catch (err: any) {
      toast({
        title: 'Agreement Draft Error',
        description: err.message || 'Could not prepare agreement draft',
        variant: 'destructive'
      });
    } finally {
      setLoadingAgreement(false);
    }
  };

  if (openChat) {
    return (
      <BookingChatModal
        bookingId={booking.id || booking.trackingId}
        onClose={() => setOpenChat(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-card-hover max-w-md w-full my-auto animate-slide-up overflow-hidden max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Confetti banner */}
        <div className="relative h-2 gradient-primary overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="absolute w-2 h-2 animate-confetti" style={{
              left: `${Math.random() * 100}%`,
              backgroundColor: ['#667eea', '#764ba2', '#10b981', '#f59e0b', '#ef4444'][i % 5],
              animationDelay: `${Math.random() * 2}s`,
              borderRadius: Math.random() > 0.5 ? '50%' : '0',
            }} />
          ))}
        </div>

        <div className="p-5 sm:p-6 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-success/10 flex items-center justify-center animate-bounce-in">
            <span className="text-3xl">✅</span>
          </div>
          <div>
            <h3 className="text-xl font-display font-bold text-foreground">Booking Confirmed!</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Your service appointment has been scheduled successfully.</p>
          </div>

          <div className="bg-muted/50 border border-border rounded-2xl p-4 text-left space-y-2">
            <div className="flex items-center gap-3 pb-2 border-b border-border">
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-lg text-primary-foreground font-bold shrink-0">
                {booking.providerName.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-foreground text-sm truncate">{booking.providerName}</div>
                <div className="text-xs text-primary font-medium truncate">{booking.serviceType}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Date:</span> <strong className="text-foreground">{booking.date}</strong></div>
              <div><span className="text-muted-foreground">Time:</span> <strong className="text-foreground">{booking.time}</strong></div>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 flex items-center justify-between">
            <div className="text-left">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Booking Tracking ID</div>
              <div className="text-sm sm:text-base font-display font-extrabold text-primary">{booking.trackingId}</div>
            </div>
            <button onClick={copyId} className="px-3 py-1.5 bg-card border border-border text-foreground text-xs font-semibold rounded-xl hover:bg-muted transition-colors">
              📋 Copy
            </button>
          </div>

          {/* ── 12-MONTH POST-SERVICE AGREEMENT CARD ── */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-4 text-left border border-indigo-500/40 shadow-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-400/20 uppercase tracking-wide">
                <Sparkles className="w-3 h-3 text-amber-300" /> Free Platform Protection
              </span>
              {agreement?.status === 'ACTIVE' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  ✓ Active (12-Mo)
                </span>
              )}
            </div>

            <div>
              <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                Activate 12-Month Service Agreement?
              </h4>
              <p className="text-[11px] text-indigo-200/80 mt-0.5 leading-relaxed">
                Enjoy priority specialist matching, 1-click on-demand service dispatch, and workmanship warranty for 12 months.
              </p>
            </div>

            <div className="pt-1">
              {agreement?.status === 'ACTIVE' ? (
                <button
                  type="button"
                  onClick={() => setShowViewModal(true)}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-all flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> View Signed Agreement Certificate
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loadingAgreement}
                  onClick={handleOpenSignAgreement}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {loadingAgreement ? 'Preparing Draft...' : '✍️ Review & Sign 12-Mo Agreement'}
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons: Chat with Provider & ServiceHub Support */}
          <div className="space-y-2 pt-1">
            <button 
              type="button"
              onClick={() => setOpenChat(true)}
              className="w-full py-2.5 gradient-primary text-primary-foreground font-bold rounded-xl text-xs shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              <span>💬 Chat with {booking.providerName}</span>
            </button>

            <div className="flex gap-2">
              <a
                href="tel:+919840994649"
                className="flex-1 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                title="ServiceHub Support"
              >
                <Phone className="w-3.5 h-3.5 text-success" />
                <span>Support: 9840994649</span>
              </a>

              <button 
                onClick={onViewBookings} 
                className="flex-1 py-2 rounded-xl bg-muted border border-border text-foreground font-semibold hover:bg-muted/80 transition-all text-xs"
              >
                View Bookings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Agreement Sign Modal */}
      {showSignModal && agreement && (
        <AgreementSignModal
          agreement={agreement}
          isOpen={showSignModal}
          onClose={() => setShowSignModal(false)}
          onSignedSuccess={(signedAgr) => {
            setAgreement(signedAgr);
            setShowSignModal(false);
          }}
        />
      )}

      {/* Agreement View Certificate Modal */}
      {showViewModal && agreement && (
        <AgreementViewModal
          agreement={agreement}
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
        />
      )}
    </div>
  );
}

