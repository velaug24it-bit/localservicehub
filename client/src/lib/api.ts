const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://localservicehub-mwwo.onrender.com');

async function request(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('servicehub_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  auth: {
    login: (credentials: { email: string; password: string }) => 
      request('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    googleLogin: (credential: string) =>
      request('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
    signup: (data: any) => 
      request('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    getProfile: () => 
      request('/api/auth/profile'),
    updateProfile: (updates: any) => 
      request('/api/auth/profile', { method: 'PUT', body: JSON.stringify(updates) })
  },
  providers: {
    list: () => request('/api/providers'),
    get: (id: string) => request(`/api/providers/${id}`),
    getBillingStatus: () => request('/api/providers/billing-status'),
    reactivate: (data: { razorpayOrderId?: string; razorpayPaymentId?: string; razorpaySignature?: string }) => 
      request('/api/providers/reactivate', { method: 'POST', body: JSON.stringify(data) })
  },
  bookings: {
    list: () => request('/api/bookings'),
    create: (data: any) => request('/api/bookings', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, updates: any) => request(`/api/bookings/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    cancel: (id: string) => request(`/api/bookings/${id}/cancel`, { method: 'PUT' }),
    pay: (id: string) => request(`/api/bookings/${id}/pay`, { method: 'PUT' })
  },
  notifications: {
    list: () => request('/api/notifications'),
    markRead: (ids?: string[]) => request('/api/notifications/read', { method: 'PUT', body: JSON.stringify({ ids }) }),
    clearAll: () => request('/api/notifications', { method: 'DELETE' })
  },
  contact: {
    submit: (data: { name: string; email: string; subject: string; message: string }) => 
      request('/api/contact', { method: 'POST', body: JSON.stringify(data) })
  },
  newsletter: {
    subscribe: (email: string) => 
      request('/api/newsletter/subscribe', { method: 'POST', body: JSON.stringify({ email }) })
  },
  ai: {
    diagnose: (data: { imageBase64: string | null; description: string }) => 
      request('/api/ai/diagnose', { method: 'POST', body: JSON.stringify(data) }),
    matchProviders: (data: { category: string; location: string; severity: string; suggestedServices: string[] }) => 
      request('/api/ai/match-providers', { method: 'POST', body: JSON.stringify(data) })
  },
  pricing: {
    calculate: (data: { category: string; location: string; serviceType: string; basePrice: number; date: string; time: string }) => 
      request('/api/pricing/smart-pricing', { method: 'POST', body: JSON.stringify(data) })
  },
  payments: {
    createOrder: (amount: number) => 
      request('/api/payments/create-order', { method: 'POST', body: JSON.stringify({ amount }) }),
    createReactivationOrder: () => 
      request('/api/payments/create-reactivation-order', { method: 'POST' })
  },
  admin: {
    providers: {
      list: () => request('/api/admin/providers'),
      approve: (id: string, approved: boolean) => 
        request(`/api/admin/providers/${id}/approve`, { method: 'PUT', body: JSON.stringify({ approved }) })
    },
    payments: {
      list: () => request('/api/admin/payments')
    },
    reactivationPayments: {
      list: () => request('/api/admin/reactivation-payments')
    },
    aiLogs: {
      list: () => request('/api/admin/ai-logs')
    },
    pricingLogs: {
      list: () => request('/api/admin/pricing-logs')
    }
  },
  reviews: {
    submit: (data: { bookingId: string; rating: number; comment?: string }) =>
      request('/api/reviews', { method: 'POST', body: JSON.stringify(data) }),
    listForProvider: (providerId: string) =>
      request(`/api/providers/${providerId}/reviews`)
  }
};
