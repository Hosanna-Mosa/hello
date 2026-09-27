/**
 * Geo helpers.
 *
 * GeoJSON is [longitude, latitude]. The client's `Coordinate` is
 * `{latitude, longitude}`. Getting that backwards is the single most common
 * bug in geo code and it fails silently — London lands in the Indian Ocean and
 * every distance is wrong, but nothing throws. Conversions live here so there
 * is one place to get it right.
 */

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export type LatLng = { latitude: number; longitude: number };

/** Great-circle distance in metres. */
export function haversineMetres(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Places a point a given distance and bearing from an origin.
 *
 * Used by the seed so the distance distribution is chosen deliberately rather
 * than falling out of a square coordinate jitter — with a jitter you get
 * whatever spread the maths happens to give, which is how every seeded profile
 * ended up inside the default filter radius.
 */
export function destination(origin: LatLng, distanceM: number, bearingDeg: number): LatLng {
  const angular = distanceM / EARTH_RADIUS_M;
  const bearing = toRad(bearingDeg);
  const lat1 = toRad(origin.latitude);
  const lon1 = toRad(origin.longitude);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { latitude: toDeg(lat2), longitude: ((toDeg(lon2) + 540) % 360) - 180 };
}

/** GeoJSON order, for writing to Mongo. */
export function toGeoJsonPoint(c: LatLng): { type: "Point"; coordinates: [number, number] } {
  return { type: "Point", coordinates: [c.longitude, c.latitude] };
}

/**
 * Quantises a distance before it goes over the wire.
 *
 * Exact metres from several points let an attacker trilaterate a home address —
 * a documented dating-app vulnerability. The client's formatter already rounds
 * to "less than 1 km" / whole km, so this costs nothing visible.
 */
export function quantiseMetres(metres: number): number {
  return metres < 10_000 ? Math.round(metres / 100) * 100 : Math.round(metres / 1_000) * 1_000;
}
