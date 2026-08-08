import { useState } from 'react';
import { Booking } from '@/contexts/AuthContext';
import { MessageSquare, Phone, ShieldCheck } from 'lucide-react';
import BookingChatModal from './chat/BookingChatModal';

interface ConfirmationModalProps {
  booking: Booking;
  onClose: () => void;
  onViewBookings: () => void;
}

export default function ConfirmationModal({ booking, onClose, onViewBookings }: ConfirmationModalProps) {
  const [openChat, setOpenChat] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(booking.trackingId);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-card-hover max-w-md w-full mx-4 animate-slide-up overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Confetti */}
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

        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center animate-bounce-in">
            <span className="text-3xl">✅</span>
          </div>
          <div>
            <h3 className="text-xl font-display font-bold text-foreground">Booking Confirmed!</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Your service appointment has been scheduled.</p>
          </div>

          <div className="bg-muted/50 border border-border rounded-2xl p-4 text-left space-y-2">
            <div className="flex items-center gap-3 pb-2 border-b border-border">
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-lg text-primary-foreground font-bold">
                {booking.providerName.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-foreground text-sm">{booking.providerName}</div>
                <div className="text-xs text-primary font-medium">{booking.serviceType}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Date:</span> <strong className="text-foreground">{booking.date}</strong></div>
              <div><span className="text-muted-foreground">Time:</span> <strong className="text-foreground">{booking.time}</strong></div>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="text-left">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Booking Tracking ID</div>
              <div className="text-base font-display font-extrabold text-primary">{booking.trackingId}</div>
            </div>
            <button onClick={copyId} className="px-3 py-1.5 bg-card border border-border text-foreground text-xs font-semibold rounded-xl hover:bg-muted transition-colors">
              📋 Copy ID
            </button>
          </div>

          {/* Action Buttons: Chat with Provider & ServiceHub Support */}
          <div className="space-y-2 pt-1">
            <button 
              type="button"
              onClick={() => setOpenChat(true)}
              className="w-full py-3 gradient-primary text-primary-foreground font-bold rounded-xl text-xs shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              <span>💬 Chat with {booking.providerName}</span>
            </button>

            <div className="flex gap-2">
              <a
                href="tel:+919840994649"
                className="flex-1 py-2.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                title="ServiceHub Support"
              >
                <Phone className="w-3.5 h-3.5 text-success" />
                <span>Support: 9840994649</span>
              </a>

              <button 
                onClick={onViewBookings} 
                className="flex-1 py-2.5 rounded-xl bg-muted border border-border text-foreground font-semibold hover:bg-muted/80 transition-all text-xs"
              >
                View Bookings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
