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
    pay: (id: string, paymentData?: any) => request(`/api/bookings/${id}/pay`, { method: 'PUT', body: JSON.stringify(paymentData || {}) })
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
  reviews: {
    submit: (data: { bookingId: string; rating: number; comment?: string }) =>
      request('/api/reviews', { method: 'POST', body: JSON.stringify(data) }),
    listForProvider: (providerId: string) =>
      request(`/api/providers/${providerId}/reviews`)
  },
  serviceCatalog: {
    getCategories: () => request('/api/service-catalog/categories'),
    getCategoryByKey: (key: string) => request(`/api/service-catalog/category-by-key/${key}`),
    getItems: (categoryId: string) => request(`/api/service-catalog/categories/${categoryId}/items`),
    getWorkTypes: (itemId: string) => request(`/api/service-catalog/items/${itemId}/work-types`),
    getProviderPricing: (providerId: string) => request(`/api/service-catalog/provider/${providerId}/pricing`),
    calculateBooking: (data: { providerId: string; serviceItems: { workTypeId: string; quantity: number }[] }) =>
      request('/api/pricing/calculate-booking', { method: 'POST', body: JSON.stringify(data) })
  },
  providerPricing: {
    list: () => request('/api/provider/pricing'),
    add: (data: any) => request('/api/provider/pricing', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { price?: number; isActive?: boolean }) =>
      request(`/api/provider/pricing/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) => request(`/api/provider/pricing/${id}`, { method: 'DELETE' }),
    toggle: (id: string) => request(`/api/provider/pricing/${id}/toggle`, { method: 'PUT' }),
    bulkUpdate: (data: { percentage: number; categoryId?: string }) =>
      request('/api/provider/pricing/bulk-update', { method: 'PUT', body: JSON.stringify(data) })
  },
  marketplace: {
    getProducts: (params: { categoryKey: string; serviceItemKey: string; workTypeKey?: string; location?: string; sortBy?: string; brand?: string; lat?: number; lng?: number; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) q.append(k, String(v)); });
      return request(`/api/marketplace/products?${q.toString()}`);
    },
    getShops: (location?: string) => request(`/api/marketplace/shops/nearby?location=${location || ''}`),
    calculateCheckout: (data: { shopId: string; products: { productId: string; quantity: number }[] }) =>
      request('/api/marketplace/calculate-checkout', { method: 'POST', body: JSON.stringify(data) }),
    getInvoices: (bookingId: string) => request(`/api/marketplace/invoices/booking/${bookingId}`)
  },
  admin: {
    providers: {
      list: () => request('/api/admin/providers'),
      approve: (id: string, approved: boolean) =>
        request(`/api/admin/providers/${id}/approve`, { method: 'PUT', body: JSON.stringify({ approved }) })
    },
    payments: {
      list: () => request('/api/admin/payments'),
      updateStatus: (id: string, data: { providerStatus?: string, materialsStatus?: string, payoutStatus?: string }) => 
        request(`/api/admin/payments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      getDailyPayouts: () => request('/api/admin/daily-payouts'),
      updatePayoutStatus: (bookingIds: string[], payoutStatus: string) =>
        request('/api/admin/payouts/status', { method: 'PUT', body: JSON.stringify({ bookingIds, payoutStatus }) })
    },
    reactivationPayments: {
      list: () => request('/api/admin/reactivation-payments')
    },
    aiLogs: {
      list: () => request('/api/admin/ai-logs')
    },
    pricingLogs: {
      list: () => request('/api/admin/pricing-logs')
    },
    serviceCatalog: {
      getCategories: () => request('/api/admin/service-catalog/categories'),
      createCategory: (data: any) => request('/api/admin/service-catalog/categories', { method: 'POST', body: JSON.stringify(data) }),
      updateCategory: (id: string, data: any) => request(`/api/admin/service-catalog/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      deleteCategory: (id: string) => request(`/api/admin/service-catalog/categories/${id}`, { method: 'DELETE' }),
      getItems: (categoryId?: string) => request(`/api/admin/service-catalog/items${categoryId ? `?categoryId=${categoryId}` : ''}`),
      createItem: (data: any) => request('/api/admin/service-catalog/items', { method: 'POST', body: JSON.stringify(data) }),
      updateItem: (id: string, data: any) => request(`/api/admin/service-catalog/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      deleteItem: (id: string) => request(`/api/admin/service-catalog/items/${id}`, { method: 'DELETE' }),
      getWorkTypes: (serviceItemId?: string) => request(`/api/admin/service-catalog/work-types${serviceItemId ? `?serviceItemId=${serviceItemId}` : ''}`),
      createWorkType: (data: any) => request('/api/admin/service-catalog/work-types', { method: 'POST', body: JSON.stringify(data) }),
      updateWorkType: (id: string, data: any) => request(`/api/admin/service-catalog/work-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      deleteWorkType: (id: string) => request(`/api/admin/service-catalog/work-types/${id}`, { method: 'DELETE' })
    },
    marketplace: {
      shops: {
        list: () => request('/api/admin/marketplace/shops'),
        create: (data: any) => request('/api/admin/marketplace/shops', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: any) => request(`/api/admin/marketplace/shops/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id: string) => request(`/api/admin/marketplace/shops/${id}`, { method: 'DELETE' })
      },
      products: {
        list: () => request('/api/admin/marketplace/products'),
        create: (data: any) => request('/api/admin/marketplace/products', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: any) => request(`/api/admin/marketplace/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id: string) => request(`/api/admin/marketplace/products/${id}`, { method: 'DELETE' })
      },
      brands: {
        list: () => request('/api/admin/marketplace/brands'),
        create: (data: any) => request('/api/admin/marketplace/brands', { method: 'POST', body: JSON.stringify(data) })
      },
      inventory: {
        list: (shopId?: string) => request(`/api/admin/marketplace/inventory${shopId ? `?shopId=${shopId}` : ''}`),
        create: (data: any) => request('/api/admin/marketplace/inventory', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: any) => request(`/api/admin/marketplace/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id: string) => request(`/api/admin/marketplace/inventory/${id}`, { method: 'DELETE' })
      },
      orders: {
        list: () => request('/api/admin/marketplace/orders'),
        update: (id: string, data: any) => request(`/api/admin/marketplace/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) })
      },
      analytics: {
        get: () => request('/api/admin/marketplace/analytics')
      }
    }
  }
};
