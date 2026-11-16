import type { PermissionKey, PermissionStatus, PermissionsState } from '../types';

export async function syncBrowserPermissionStates(current: PermissionsState): Promise<PermissionsState> {
  const next: PermissionsState = { ...current };

  if ('Notification' in window) {
    if (Notification.permission === 'granted') next.notifications = 'granted';
    else if (Notification.permission === 'denied') next.notifications = 'denied';
  }

  if ('permissions' in navigator && typeof navigator.permissions.query === 'function') {
    try {
      const res = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      if (res.state === 'granted') next.location = 'granted';
      else if (res.state === 'denied') next.location = 'denied';
    } catch {
      // Browser does not support querying this permission name
    }
  }

  return next;
}

export async function requestSinglePermission(key: PermissionKey): Promise<PermissionStatus> {
  try {
    if (key === 'notifications') {
      if (!('Notification' in window)) return 'denied';
      const perm = await Notification.requestPermission();
      return perm === 'granted' ? 'granted' : 'denied';
    }

    if (key === 'location') {
      if (!('geolocation' in navigator)) return 'denied';
      return await new Promise<PermissionStatus>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve('granted'),
          () => resolve('denied'),
          { timeout: 6000, maximumAge: 60000 }
        );
      });
    }

  } catch {
    return 'denied';
  }
  return 'denied';
}

export async function detectCountryFromDevice(locationGranted: boolean): Promise<string> {
  if (locationGranted && 'geolocation' in navigator) {
    try {
      const coords = await new Promise<{ lat: number; lon: number } | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 5000, maximumAge: 300000 }
        );
      });

      if (coords) {
        const res = await fetch(`/api/geocode-country?lat=${coords.lat}&lon=${coords.lon}`);
        if (res.ok) {
          const data = (await res.json()) as { ok?: boolean; country?: string };
          if (data.ok && data.country) return data.country;
        }
      }
    } catch {
      // Fall through to Angola fallback
    }
  }

  // Try timezone/locale hint for Lusophone countries, otherwise default strictly to Angola
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Luanda')) return 'Angola';
    if (tz.includes('Sao_Paulo') || tz.includes('America/Recife') || tz.includes('America/Fortaleza')) return 'Brasil';
    if (tz.includes('Lisbon') || tz.includes('Azores') || tz.includes('Madeira')) return 'Portugal';
    if (tz.includes('Maputo')) return 'Moçambique';
    if (tz.includes('Cape_Verde')) return 'Cabo Verde';
    if (tz.includes('Bissau')) return 'Guiné-Bissau';
    if (tz.includes('Sao_Tome')) return 'São Tomé e Príncipe';
    if (tz.includes('Dili')) return 'Timor-Leste';
  } catch {
    // ignore
  }

  return 'Angola';
}
