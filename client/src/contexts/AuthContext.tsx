import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  location: string;
  userType: 'customer' | 'provider' | 'admin';
  approved?: boolean;
}

export interface Booking {
  id: string;
  trackingId: string;
  providerId: string;
  providerName: string;
  serviceType: string;
  category: string;
  date: string;
  time: string;
  description: string;
  phone: string;
  location: string;
  price: string;
  status: string;
  currentStep: number;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  advanceTransactionId?: string;
  paymentStatus?: string;
  providerUpiId?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  bookings: Booking[];
  login: (email: string, password: string) => Promise<void>;
  signup: (data: Omit<User, 'id'> & { password: string }) => Promise<void>;
  logout: () => Promise<void>;
  addBooking: (booking: Omit<Booking, 'id' | 'trackingId' | 'createdAt' | 'status' | 'currentStep'>) => Promise<Booking>;
  updateBooking: (id: string, updates: Partial<Booking>) => Promise<void>;
  cancelBooking: (id: string) => Promise<void>;
  refreshBookings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const fetchBookings = async () => {
    try {
      const data = await api.bookings.list();
      setBookings(data);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('servicehub_token');
      if (token) {
        try {
          const profile = await api.auth.getProfile();
          setUser(profile);
          await fetchBookings();
        } catch (err) {
          console.error('Session restoration failed:', err);
          localStorage.removeItem('servicehub_token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    localStorage.setItem('servicehub_token', res.token);
    setUser(res.user);
    // Fetch bookings immediately after login
    const bData = await api.bookings.list();
    setBookings(bData);
  };

  const signup = async (data: Omit<User, 'id'> & { password: string }) => {
    const res = await api.auth.signup(data);
    localStorage.setItem('servicehub_token', res.token);
    setUser(res.user);
    setBookings([]);
  };

  const logout = async () => {
    localStorage.removeItem('servicehub_token');
    setUser(null);
    setBookings([]);
  };

  const addBooking = async (data: Omit<Booking, 'id' | 'trackingId' | 'createdAt' | 'status' | 'currentStep'>): Promise<Booking> => {
    const inserted = await api.bookings.create(data);
    setBookings(prev => [inserted, ...prev]);
    return inserted;
  };

  const updateBooking = async (id: string, updates: Partial<Booking>) => {
    const updated = await api.bookings.update(id, updates);
    setBookings(prev => prev.map(b => b.id === id ? updated : b));
  };

  const cancelBooking = async (id: string) => {
    const cancelled = await api.bookings.cancel(id);
    setBookings(prev => prev.map(b => b.id === id ? cancelled : b));
  };

  const refreshBookings = async () => {
    if (user) await fetchBookings();
  };

  return (
    <AuthContext.Provider value={{ user, loading, bookings, login, signup, logout, addBooking, updateBooking, cancelBooking, refreshBookings }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
