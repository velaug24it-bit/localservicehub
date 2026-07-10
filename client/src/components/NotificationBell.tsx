import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, X, Eye } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [activeDetail, setActiveDetail] = useState<Notification | null>(null);
  const { items, unreadCount, markAllRead, markRead, clearAll } = useNotifications();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleNotificationClick = (n: Notification) => {
    setActiveDetail(n);
    if (!n.read) {
      markRead(n.id);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell Button */}
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && unreadCount > 0) markAllRead();
        }}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown (Desktop) / Modal (Mobile) */}
      {open && (
        <>
          {/* Mobile Background Backdrop */}
          <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-40 sm:hidden" onClick={() => setOpen(false)} />

          <div className="fixed inset-x-4 top-[10vh] max-h-[80vh] sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 bg-card rounded-xl shadow-card-hover border border-border overflow-hidden animate-slide-up z-50 flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="font-display font-bold text-foreground">Notifications</h3>
              <div className="flex items-center gap-3">
                {items.length > 0 && (
                  <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground sm:hidden">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[60vh] sm:max-h-96">
              {items.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No notifications yet
                </div>
              ) : (
                items.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left px-4 py-3.5 border-b border-border last:border-0 hover:bg-muted/65 transition-colors cursor-pointer flex gap-3 items-start justify-between ${
                      !n.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/80 mt-1.5 flex items-center gap-1.5">
                        <span>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </p>
                    </div>
                    <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 self-center">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Notification Detail Modal (Full viewport center overlay) */}
      {activeDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/60 backdrop-blur-sm p-4" onClick={() => setActiveDetail(null)}>
          <div 
            className="bg-card rounded-2xl border border-border shadow-card-hover max-w-md w-full overflow-hidden animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="gradient-primary p-5 text-primary-foreground flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔔</span>
                <h4 className="font-display font-bold">Notification Details</h4>
              </div>
              <button 
                onClick={() => setActiveDetail(null)} 
                className="text-primary-foreground/75 hover:text-primary-foreground p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <h5 className="text-base font-bold text-foreground">{activeDetail.title}</h5>
                <p className="text-xs text-muted-foreground">
                  Received: {new Date(activeDetail.createdAt).toLocaleString()} ({formatDistanceToNow(new Date(activeDetail.createdAt), { addSuffix: true })})
                </p>
              </div>
              <div className="p-4 bg-muted/40 border border-border rounded-xl">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{activeDetail.message}</p>
              </div>
              <button 
                onClick={() => setActiveDetail(null)}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}