import { useEffect, useRef } from 'react';
import { pushAPI } from '../services/api';

const VAPID_PUBLIC_KEY = 'BIUiYyl8GENmKBGmRvVniaFJIydCfR31qatmT_-sjRjowmG3GsKFCu-GS3ycCaroS4AEQNImMMljKd2-5a5mZIk';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function usePushNotifications(isAuthenticated) {
  const subscribed = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || subscribed.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const subscribe = async () => {
      try {
        // Only ask if not already granted or denied
        if (Notification.permission === 'denied') return;

        const permission = Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();

        if (permission !== 'granted') return;

        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        const subscription = existing || await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        const subJson = subscription.toJSON();
        await pushAPI.subscribe({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        });

        subscribed.current = true;
      } catch {
        // Silent — push is optional, never break the app
      }
    };

    subscribe();
  }, [isAuthenticated]);
}
