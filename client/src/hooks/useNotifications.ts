import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  bookingId: string | null;
  read: boolean;
  createdAt: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('servicehub_push_enabled');
      return saved !== 'false'; // defaults to true
    }
    return true;
  });

  const togglePush = useCallback((enabled: boolean) => {
    setPushEnabled(enabled);
    localStorage.setItem('servicehub_push_enabled', String(enabled));
  }, []);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.notifications.list();
      if (data) setItems(data as Notification[]);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Request notification permission on mount (only if push is enabled)
  useEffect(() => {
    if (pushEnabled && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(err => console.warn('Notification permission request failed', err));
      }
    }
  }, [pushEnabled]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    fetchAll();

    const interval = setInterval(() => {
      const checkNew = async () => {
        try {
          const data = await api.notifications.list();
          if (data) {
            setItems(prev => {
              const prevIds = new Set(prev.map(item => item.id));
              const newItems = data.filter((item: any) => !prevIds.has(item.id));
              
              newItems.forEach((n: any) => {
                toast(n.title, { description: n.message });
                // Browser Push Notification (only if pushEnabled is true)
                if (pushEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  try {
                    new window.Notification(n.title, {
                      body: n.message,
                      icon: '/favicon.ico',
                    });
                  } catch (err) {
                    console.warn('Failed to show push notification:', err);
                  }
                }
              });
              
              return data as Notification[];
            });
          }
        } catch (e) {
          console.warn('Failed to poll notifications:', e);
        }
      };
      checkNew();
    }, 10000); // Check every 10 seconds

    return () => {
      clearInterval(interval);
    };
  }, [user, fetchAll, pushEnabled]);

  const unreadCount = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!user) return;
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    if (ids.length === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.notifications.markRead();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await api.notifications.markRead([id]);
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const clearAll = async () => {
    if (!user) return;
    setItems([]);
    try {
      await api.notifications.clearAll();
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  return { items, unreadCount, loading, markAllRead, markRead, clearAll, refresh: fetchAll, pushEnabled, togglePush };
}