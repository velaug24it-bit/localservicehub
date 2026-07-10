import { Booking } from '@/contexts/AuthContext';

interface ConfirmationModalProps {
  booking: Booking;
  onClose: () => void;
  onViewBookings: () => void;
}

export default function ConfirmationModal({ booking, onClose, onViewBookings }: ConfirmationModalProps) {
  const copyId = () => {
    navigator.clipboard.writeText(booking.trackingId);
  };

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

        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center animate-bounce-in">
            <span className="text-3xl">✅</span>
          </div>
          <h3 className="text-xl font-display font-bold text-foreground mb-1">Booking Confirmed!</h3>
          <p className="text-sm text-muted-foreground mb-4">Your service has been booked successfully.</p>

          <div className="bg-muted rounded-xl p-4 mb-4 text-left">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-lg">
                {booking.providerName.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-foreground text-sm">{booking.providerName}</div>
                <div className="text-xs text-muted-foreground">{booking.serviceType}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Date:</span> <span className="text-foreground font-medium">{booking.date}</span></div>
              <div><span className="text-muted-foreground">Time:</span> <span className="text-foreground font-medium">{booking.time}</span></div>
            </div>
          </div>

          <div className="bg-accent rounded-xl p-4 mb-4">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Tracking ID</div>
            <div className="text-xl font-display font-bold gradient-text">{booking.trackingId}</div>
            <button onClick={copyId} className="mt-2 text-xs text-primary hover:underline">📋 Copy ID</button>
            <p className="text-xs text-muted-foreground mt-1">Save this to track your service</p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { copyId(); }} className="flex-1 py-2.5 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors text-sm">
              Copy ID
            </button>
            <button onClick={onViewBookings} className="flex-1 gradient-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:opacity-90 transition-all text-sm">
              View Bookings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
