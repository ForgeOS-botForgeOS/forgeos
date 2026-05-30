// Geofenced gym check-in. Opt-in only: the watch is started explicitly from
// settings. Privacy-respecting — coordinates never leave the device in mock mode.

export interface GymGeofence {
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
}

// A sensible default "home gym" fence the user can later relocate.
export const DEFAULT_GYM: GymGeofence = { name: 'My Forge', lat: 52.52, lng: 13.405, radiusM: 120 };

function distanceM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function watchGym(fence: GymGeofence, onEnter: () => void): () => void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return () => {};
  let inside = false;
  const id = navigator.geolocation.watchPosition(
    (pos) => {
      const d = distanceM(pos.coords.latitude, pos.coords.longitude, fence.lat, fence.lng);
      const nowInside = d <= fence.radiusM;
      if (nowInside && !inside) onEnter(); // "Welcome to the Forge"
      inside = nowInside;
    },
    () => {
      /* permission denied — silently stop */
    },
    { enableHighAccuracy: false, maximumAge: 30000, timeout: 27000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}
