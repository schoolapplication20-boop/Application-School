import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';
import { getStoredUser } from './secureStorage';
import { navigationRef } from '../navigation/navigationRef';

const MESSAGE_ROUTE_BY_ROLE = {
  STUDENT: 'StudentMessages',
  TEACHER: 'TeacherMessages',
  ADMIN: 'AdminMessages',
  SUPER_ADMIN: 'SuperAdminDashboard',
};

// Show alerts/sounds for notifications received while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Requests permission and returns this device's Expo push token, or null if unavailable/denied. */
async function getExpoPushToken() {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token;
}

/** Registers this device's push token with the backend for the logged-in user. Best-effort — failures are silent. */
export async function syncPushToken() {
  try {
    const token = await getExpoPushToken();
    if (token) {
      await api.post('/api/auth/push-token', { token });
    }
  } catch {
    // Permissions denied, simulator, or network error — push notifications are non-critical.
  }
}

/** Unregisters this device's push token from the backend. Best-effort — failures are silent. */
export async function clearPushToken() {
  try {
    await api.post('/api/auth/push-token', { token: '' });
  } catch {
    // best-effort
  }
}

/** Navigates to the screen relevant to a tapped notification, based on its data payload and the logged-in user's role. */
async function navigateForNotification(data) {
  if (data?.type !== 'message') return;
  const user = await getStoredUser();
  const route = MESSAGE_ROUTE_BY_ROLE[user?.role];
  if (route && navigationRef.isReady()) navigationRef.navigate(route);
}

/** Handles the notification that launched the app (cold start), if any. */
export async function handleInitialNotification() {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (response) navigateForNotification(response.notification.request.content.data);
}

/** Registers a tap handler for notifications received while the app is running. Returns an unsubscribe function. */
export function attachNotificationOpenedListener() {
  const sub = Notifications.addNotificationResponseReceivedListener(response =>
    navigateForNotification(response.notification.request.content.data)
  );
  return () => sub.remove();
}
