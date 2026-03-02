import AsyncStorage from '@react-native-async-storage/async-storage';

// Session keys
const SESSION_KEYS = [
  'token',
  'user',
  'userId',
  'userEmail',
  'userFirstName',
  'userLastName',
  'accountType',
  'businessId',
  'businessName',
  'isAuthenticated',
];

export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    return AsyncStorage.getItem(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(key, value);
  },

  removeItem: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
  },

  // Session management
  hasActiveSession: async (): Promise<boolean> => {
    const isAuthenticated = await AsyncStorage.getItem('isAuthenticated');
    const userId = await AsyncStorage.getItem('userId');
    return isAuthenticated === 'true' && userId !== null;
  },

  getCurrentSession: async () => {
    const isActive = await storage.hasActiveSession();
    if (!isActive) return null;

    try {
      const keys = ['user', 'userId', 'userEmail', 'userFirstName', 'userLastName',
        'accountType', 'businessId', 'businessName', 'token'];
      const values = await Promise.all(keys.map(k => AsyncStorage.getItem(k)));
      const [userStr, userId, email, firstName, lastName, accountType, businessId, businessName, token] = values;

      const user = userStr ? JSON.parse(userStr) : null;

      return {
        userId,
        email,
        firstName,
        lastName,
        accountType,
        businessId,
        businessName,
        token,
        user,
      };
    } catch (error) {
      console.error('Error reading session:', error);
      return null;
    }
  },

  setSession: async (userData: any, token: string): Promise<void> => {
    const pairs: [string, string][] = [
      ['token', token],
      ['user', JSON.stringify(userData)],
      ['userId', userData._id || userData.id],
      ['userEmail', userData.email],
      ['userFirstName', userData.firstName],
      ['userLastName', userData.lastName],
      ['accountType', userData.accountType],
      ['isAuthenticated', 'true'],
    ];

    if (userData.businessId) {
      pairs.push(['businessId', userData.businessId]);
    }
    if (userData.businessName) {
      pairs.push(['businessName', userData.businessName]);
    }

    await Promise.all(pairs.map(([k, v]) => AsyncStorage.setItem(k, v)));
  },

  clearSession: async (): Promise<void> => {
    await Promise.all(SESSION_KEYS.map(k => AsyncStorage.removeItem(k)));
  },

  isPersonalAccount: async (): Promise<boolean> => {
    const accountType = await AsyncStorage.getItem('accountType');
    return accountType === 'personal';
  },

  isBusinessAccount: async (): Promise<boolean> => {
    const accountType = await AsyncStorage.getItem('accountType');
    return accountType === 'business';
  },

  getUserId: async (): Promise<string | null> => {
    return AsyncStorage.getItem('userId');
  },

  getToken: async (): Promise<string | null> => {
    return AsyncStorage.getItem('token');
  },

  getAccountType: async (): Promise<string | null> => {
    return AsyncStorage.getItem('accountType');
  },

  // Favorites management
  getFavorites: async (): Promise<any[]> => {
    try {
      const data = await AsyncStorage.getItem('subs-favorites');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setFavorites: async (favorites: any[]): Promise<void> => {
    await AsyncStorage.setItem('subs-favorites', JSON.stringify(favorites));
  },

  // Pending booking (for payment flow)
  setPendingBooking: async (booking: any): Promise<void> => {
    await AsyncStorage.setItem('pending-payment-booking', JSON.stringify(booking));
  },

  getPendingBooking: async (): Promise<any | null> => {
    try {
      const data = await AsyncStorage.getItem('pending-payment-booking');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  clearPendingBooking: async (): Promise<void> => {
    await AsyncStorage.removeItem('pending-payment-booking');
  },

  // Local bookings cache
  getLocalBookings: async (): Promise<any[]> => {
    try {
      const data = await AsyncStorage.getItem('subs-bookings');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setLocalBookings: async (bookings: any[]): Promise<void> => {
    await AsyncStorage.setItem('subs-bookings', JSON.stringify(bookings));
  },
};

export default storage;
