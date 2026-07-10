import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { items, unreadCount, markAllRead, markRead, clearAll } = useNotifications();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
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
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card rounded-xl shadow-card-hover border border-border overflow-hidden animate-slide-up z-50">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-bold text-foreground">Notifications</h3>
            {items.length > 0 && (
              <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No notifications yet
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-muted transition-colors ${
                    !n.read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}