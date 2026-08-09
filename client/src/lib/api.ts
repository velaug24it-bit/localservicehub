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

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    let errMsg = `Request failed with status ${res.status}`;
    if (contentType.includes('application/json')) {
      const errData = await res.json().catch(() => ({}));
      errMsg = errData.error || errData.message || errMsg;
    }
    throw new Error(errMsg);
  }

  if (contentType.includes('application/json')) {
    return await res.json();
  }
  return await res.text();
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
        request(`/api/admin/providers/${id}/approve`, { method: 'PUT', body: JSON.stringify({ approved }) }),
      getActivityHistory: (id: string) => request(`/api/admin/providers/${id}/activity-history`)
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
    },
    retention: {
      getOverview: () => request('/api/admin/retention/overview'),
      getWarrantyClaims: () => request('/api/admin/retention/warranty-claims'),
      updateWarrantyClaim: (id: string, data: any) => request(`/api/admin/retention/warranty-claims/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      getRules: () => request('/api/admin/retention/rules'),
      updateRules: (data: any) => request('/api/admin/retention/rules', { method: 'PUT', body: JSON.stringify(data) }),
      getPayoutRequests: () => request('/api/admin/retention/payout-requests'),
      updatePayoutRequest: (id: string, data: any) => request(`/api/admin/retention/payout-requests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      getTopProviders: () => request('/api/admin/retention/top-providers'),
      awardTopProviderBonus: (data: { providerId: string; bonusAmount: number; bonusTitle?: string; rank?: number }) => 
        request('/api/admin/retention/award-top-provider-bonus', { method: 'POST', body: JSON.stringify(data) })
    }
  },
  customerRetention: {
    getSummary: () => request('/api/customer/retention-summary'),
    getWarranties: () => request('/api/warranties'),
    claimWarranty: (id: string, issueDescription: string) => request(`/api/warranties/${id}/claim`, { method: 'POST', body: JSON.stringify({ issueDescription }) }),
    getWallet: () => request('/api/wallet'),
    topupWallet: (amount: number, description?: string) => request('/api/wallet/topup', { method: 'POST', body: JSON.stringify({ amount, description }) }),
    redeemWallet: (amount: number, bookingId?: string, description?: string) => request('/api/wallet/redeem', { method: 'POST', body: JSON.stringify({ amount, bookingId, description }) }),
    getRewards: () => request('/api/rewards'),
    redeemRewards: (pointsToRedeem: number) => request('/api/rewards/redeem', { method: 'POST', body: JSON.stringify({ pointsToRedeem }) }),
    getMembershipPlans: () => request('/api/memberships/plans'),
    subscribeMembership: (planType: string) => request('/api/memberships/subscribe', { method: 'POST', body: JSON.stringify({ planType }) }),
    withdrawWallet: (amount: number, upiId: string) => request('/api/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amount, upiId }) }),
    getRebookingPayload: (bookingId: string) => request(`/api/customer/rebooking/${bookingId}`)
  },
  retention: {
    getCustomerRetention: () => request('/api/customer/retention-summary'),
    getWarranties: () => request('/api/warranties'),
    claimWarranty: (id: string, issueDescription: string) => request(`/api/warranties/${id}/claim`, { method: 'POST', body: JSON.stringify({ issueDescription }) }),
    getWallet: () => request('/api/wallet'),
    topupWallet: (amount: number, description?: string) => request('/api/wallet/topup', { method: 'POST', body: JSON.stringify({ amount, description }) }),
    redeemWallet: (amount: number, bookingId?: string, description?: string) => request('/api/wallet/redeem', { method: 'POST', body: JSON.stringify({ amount, bookingId, description }) }),
    withdrawWallet: (amount: number, upiId: string) => request('/api/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amount, upiId }) }),
    getRewards: () => request('/api/rewards'),
    redeemRewardPoints: (pointsToRedeem: number) => request('/api/rewards/redeem', { method: 'POST', body: JSON.stringify({ pointsToRedeem }) }),
    getMembershipPlans: () => request('/api/memberships/plans'),
    subscribeMembership: (planType: string) => request('/api/memberships/subscribe', { method: 'POST', body: JSON.stringify({ planType }) }),
    getRebookingPayload: (bookingId: string) => request(`/api/customer/rebooking/${bookingId}`)
  },
  providerBusiness: {
    getAnalytics: () => request('/api/provider-business/analytics'),
    getReputation: () => request('/api/provider-business/reputation'),
    getLevels: () => request('/api/provider-business/levels'),
    getReports: () => request('/api/provider-business/reports'),
    getWallet: () => request('/api/provider-business/wallet'),
    withdraw: (amount: number, upiId?: string) => request('/api/provider-business/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amount, upiId }) }),
    getInsights: () => request('/api/provider-business/insights'),
    getMarketplaceBenefits: () => request('/api/provider-business/marketplace-benefits'),
    getTraining: () => request('/api/provider-business/training'),
    completeCourse: (courseId: string) => request(`/api/provider-business/training/${courseId}/complete`, { method: 'POST' })
  },
  providerWarranty: {
    list: () => request('/api/provider/warranty-claims'),
    resolve: (id: string, resolutionNotes?: string) => request(`/api/provider/warranty-claims/${id}/resolve`, { method: 'POST', body: JSON.stringify({ resolutionNotes }) }),
    getByBooking: (bookingId: string) => request(`/api/provider/bookings/${bookingId}/warranty`),
    setBookingWarranty: (bookingId: string, data: { durationDays: number; coverageTerms?: string }) => request(`/api/provider/bookings/${bookingId}/set-warranty`, { method: 'POST', body: JSON.stringify(data) })
  },
  chat: {
    getBookingChat: (bookingId: string) => 
      request(`/api/chat/booking/${bookingId}`),
    sendMessage: (bookingId: string, data: { message: string; messageType?: string; mediaUrl?: string }) => 
      request(`/api/chat/booking/${bookingId}/messages`, { method: 'POST', body: JSON.stringify(data) }),
    getProviderConversations: () => 
      request('/api/chat/provider/conversations'),
    getCustomerConversations: () => 
      request('/api/chat/customer/conversations'),
    getUnreadSummary: () => 
      request('/api/chat/unread-summary'),
    getAdminConversations: (search?: string) => 
      request(`/api/chat/admin/conversations${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    updateAdminConversation: (id: string, data: { status?: string; isReadOnly?: boolean; extendDays?: number }) => 
      request(`/api/chat/admin/conversations/${id}/status`, { method: 'PUT', body: JSON.stringify(data) })
  },
  aiCoach: {
    getCoachData: () => request('/api/provider-business/ai-coach'),
    getGoals: () => request('/api/provider-business/goals'),
    saveGoals: (data: { monthlyRevenueTarget?: number; monthlyBookingTarget?: number; ratingTarget?: number; repeatCustomerTarget?: number }) =>
      request('/api/provider-business/goals', { method: 'POST', body: JSON.stringify(data) })
  },
  agreements: {
    create: (data: { bookingId: string }) => 
      request('/api/agreements', { method: 'POST', body: JSON.stringify(data) }),
    getMy: () => 
      request('/api/agreements/my'),
    get: (id: string) => 
      request(`/api/agreements/${id}`),
    sign: (id: string, data: { fullName: string; signatureType: 'drawn' | 'typed'; signatureData: string; consent: boolean }) => 
      request(`/api/agreements/${id}/sign`, { method: 'POST', body: JSON.stringify(data) }),
    createServiceRequest: (id: string, data: { description: string; attachments?: string[] }) => 
      request(`/api/agreements/${id}/service-requests`, { method: 'POST', body: JSON.stringify(data) }),
    getServiceRequests: (id: string) => 
      request(`/api/agreements/${id}/service-requests`),
    confirmCompletion: (requestId: string) => 
      request(`/api/agreement-service-requests/${requestId}/customer-confirm`, { method: 'POST' })
  },
  agreementAdmin: {
    listAgreements: () => 
      request('/api/admin/agreements'),
    listTemplates: () => 
      request('/api/admin/agreement-templates'),
    createTemplate: (data: any) => 
      request('/api/admin/agreement-templates', { method: 'POST', body: JSON.stringify(data) }),
    updateTemplate: (id: string, data: any) => 
      request(`/api/admin/agreement-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    listServiceRequests: () => 
      request('/api/admin/agreement-service-requests'),
    assignProvider: (requestId: string, data: { providerId: string }) => 
      request(`/api/admin/agreement-service-requests/${requestId}/assign`, { method: 'POST', body: JSON.stringify(data) }),
    updateAgreementStatus: (id: string, status: string) => 
      request(`/api/admin/agreements/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) })
  },
  agreementProvider: {
    listRequests: () => 
      request('/api/provider/agreement-service-requests'),
    acceptRequest: (requestId: string) => 
      request(`/api/provider/agreement-service-requests/${requestId}/accept`, { method: 'POST' }),
    declineRequest: (requestId: string, reason?: string) => 
      request(`/api/provider/agreement-service-requests/${requestId}/decline`, { method: 'POST', body: JSON.stringify({ reason }) }),
    updateStatus: (requestId: string, status: string) => 
      request(`/api/provider/agreement-service-requests/${requestId}/update-status`, { method: 'POST', body: JSON.stringify({ status }) })
  }
};


