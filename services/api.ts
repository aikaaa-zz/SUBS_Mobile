import { API_BASE_URL } from '../constants/api';
import { storage } from '../utils/storage';

const REQUEST_TIMEOUT = 15000;

const getAuthToken = async (): Promise<string | null> => {
  return storage.getToken();
};

const fetchWithTimeout = (url: string, options: RequestInit, timeout = REQUEST_TIMEOUT): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return fetch(url, { ...options, signal: controller.signal })
    .then((response) => {
      clearTimeout(timeoutId);
      return response;
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      throw error;
    });
};

const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3): Promise<Response> => {
  let lastError: Error | undefined;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);
      if (response.status >= 500 && i < maxRetries - 1) {
        lastError = new Error(`Server error: ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      return response;
    } catch (error: any) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  throw lastError;
};

const parseResponseBody = async (response: Response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const authFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetchWithRetry(url, {
      ...options,
      headers,
    });

    const body = await parseResponseBody(response);

    if (!response.ok) {
      const message = body.message || body.error || `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return body;
  } catch (error: any) {
    if (error.message === 'Failed to fetch' || error.message === 'Network request failed' || error.name === 'TypeError') {
      console.error(`API Connection Error [${endpoint}]:`, error);
      throw new Error('Unable to connect to the server. Please make sure the backend is running.');
    }
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
};

// User API
export const userAPI = {
  register: async (userData: any) => {
    return await authFetch('/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  login: async (credentials: any) => {
    return await authFetch('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  logout: async () => {
    return await authFetch('/logout', {
      method: 'POST',
    });
  },

  verifyToken: async () => {
    return await authFetch('/verify');
  },

  updateAccountType: async (userId: string, accountType: string) => {
    return await authFetch(`/user/${userId}/account-type`, {
      method: 'PUT',
      body: JSON.stringify({ accountType }),
    });
  },

  forgotPassword: async (data: any) => {
    return await authFetch('/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  resetPassword: async (data: any) => {
    return await authFetch('/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateProfile: async (userId: string, data: { firstName?: string; lastName?: string; email?: string }) => {
    return await authFetch(`/user/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Website API
export const websiteAPI = {
  getPublicWebsites: async () => {
    return await authFetch('/public/websites');
  },

  getWebsiteBySlug: async (slug: string) => {
    return await authFetch(`/public/websites/${slug}`);
  },

  getWebsiteById: async (websiteId: string) => {
    return await authFetch(`/websites/${websiteId}`);
  },
};

// Booking API
export const bookingAPI = {
  createBooking: async (bookingData: any) => {
    return await authFetch('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  getCustomerBookings: async (customerId: string) => {
    return await authFetch(`/bookings/customer/${customerId}`);
  },

  getBookingById: async (bookingId: string) => {
    return await authFetch(`/bookings/${bookingId}`);
  },

  updateBookingStatus: async (bookingId: string, status: string) => {
    return await authFetch(`/bookings/${bookingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  updateBooking: async (bookingId: string, updates: any) => {
    return await authFetch(`/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteBooking: async (bookingId: string) => {
    return await authFetch(`/bookings/${bookingId}`, {
      method: 'DELETE',
    });
  },

  getBusinessBookings: async (businessId: string) => {
    return await authFetch(`/bookings/business/${businessId}`);
  },
};

// Payment API
export const paymentAPI = {
  createGCashPayment: async (paymentData: any) => {
    return await authFetch('/payments/gcash/create-source', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  createPaymentIntent: async (paymentData: any) => {
    return await authFetch('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  getPaymentStatus: async (paymentId: string) => {
    return await authFetch(`/payments/${paymentId}/status`);
  },

  getUserPayments: async (userId: string, status: string | null = null) => {
    const query = status ? `?status=${status}` : '';
    return await authFetch(`/payments/user/${userId}${query}`);
  },

  getPaymentDetails: async (paymentId: string) => {
    return await authFetch(`/payments/${paymentId}`);
  },
};

// Analytics API
export const analyticsAPI = {
  trackEvent: async (eventData: any) => {
    try {
      return await authFetch('/analytics/track', {
        method: 'POST',
        body: JSON.stringify(eventData),
      });
    } catch (error) {
      console.error('Analytics tracking failed:', error);
    }
  },

  getWebsiteAnalytics: async (websiteId: string) => {
    return await authFetch(`/analytics/website/${websiteId}`);
  },
};

// OTP API
export const otpAPI = {
  sendOtp: async (data: any) => {
    return await authFetch('/otp/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  verifyOtp: async (data: any) => {
    return await authFetch('/otp/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Notification API
export const notificationAPI = {
  getUserNotifications: async (userId: string, unreadOnly = false) => {
    const query = unreadOnly ? '?unreadOnly=true' : '';
    return await authFetch(`/notifications/user/${userId}${query}`);
  },

  markAsRead: async (notificationId: string) => {
    return await authFetch(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  },

  markAllAsRead: async (userId: string) => {
    return await authFetch(`/notifications/user/${userId}/read-all`, {
      method: 'PATCH',
    });
  },

  deleteNotification: async (notificationId: string, userId: string) => {
    return await authFetch(`/notifications/${notificationId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });
  },
};

// Feedback API
export const feedbackAPI = {
  submitFeedback: async (feedbackData: any) => {
    return await authFetch('/feedback', {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    });
  },

  getWebsiteFeedback: async (websiteId: string, status = 'approved') => {
    const query = status ? `?status=${status}` : '';
    return await authFetch(`/feedback/website/${websiteId}${query}`);
  },

  getUserFeedback: async (userId: string) => {
    return await authFetch(`/feedback/user/${userId}`);
  },

  respondToFeedback: async (feedbackId: string, responseText: string, respondedBy: string) => {
    return await authFetch(`/feedback/${feedbackId}/respond`, {
      method: 'PATCH',
      body: JSON.stringify({ responseText, respondedBy }),
    });
  },
};

export default {
  userAPI,
  websiteAPI,
  bookingAPI,
  paymentAPI,
  analyticsAPI,
  otpAPI,
  notificationAPI,
  feedbackAPI,
};
