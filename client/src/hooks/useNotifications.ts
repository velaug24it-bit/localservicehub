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
  }, [user, fetchAll]);

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

  return { items, unreadCount, loading, markAllRead, markRead, clearAll, refresh: fetchAll };
}