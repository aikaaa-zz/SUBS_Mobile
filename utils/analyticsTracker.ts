import { analyticsAPI } from '../services/api';
import { storage } from './storage';
import { Platform } from 'react-native';

let visitorIdCache: string | null = null;
let sessionId: string | null = null;

const getVisitorId = async (): Promise<string> => {
  if (visitorIdCache) return visitorIdCache;

  let visitorId = await storage.getItem('visitor_id');
  if (!visitorId) {
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await storage.setItem('visitor_id', visitorId);
  }
  visitorIdCache = visitorId;
  return visitorId;
};

const getSessionId = (): string => {
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return sessionId;
};

export const trackEvent = async (eventData: any) => {
  try {
    const visitorId = await getVisitorId();
    const sid = getSessionId();

    const enrichedData = {
      ...eventData,
      visitorId,
      sessionId: sid,
      userAgent: `SUBS-Mobile-Expo/${Platform.OS}`,
      referrer: 'mobile-app',
      timestamp: new Date().toISOString(),
    };

    await analyticsAPI.trackEvent(enrichedData);
  } catch (error) {
    console.error('Analytics tracking failed:', error);
  }
};

export const trackPageView = async (websiteId: string, ownerId: string, businessId: string, metadata = {}) => {
  await trackEvent({ websiteId, ownerId, businessId, eventType: 'page_view', metadata });
};

export const trackViewAndBookClick = async (websiteId: string, ownerId: string, businessId: string, metadata = {}) => {
  await trackEvent({ websiteId, ownerId, businessId, eventType: 'view_and_book_click', metadata });
};

export const trackBookNowClick = async (websiteId: string, ownerId: string, businessId: string, metadata = {}) => {
  await trackEvent({ websiteId, ownerId, businessId, eventType: 'book_now_click', metadata });
};

export const trackBookingSubmission = async (websiteId: string, ownerId: string, businessId: string, metadata = {}) => {
  await trackEvent({ websiteId, ownerId, businessId, eventType: 'booking_completed', metadata });
};

export const trackPaymentInitiation = async (websiteId: string, ownerId: string, businessId: string, metadata = {}) => {
  await trackEvent({ websiteId, ownerId, businessId, eventType: 'booking_modal_open', metadata });
};

export default {
  trackEvent,
  trackPageView,
  trackViewAndBookClick,
  trackBookNowClick,
  trackBookingSubmission,
  trackPaymentInitiation,
};
