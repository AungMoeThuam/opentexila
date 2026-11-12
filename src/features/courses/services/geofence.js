// Plain helpers for the location editor. They hold the rules that the map,
// the number inputs and the radius slider all share, so they are easy to test.
import { MAX_RADIUS_M, MIN_RADIUS_M } from './course-class-validation.js';

export const MIN_LATITUDE = -90;
export const MAX_LATITUDE = 90;
export const MIN_LONGITUDE = -180;
export const MAX_LONGITUDE = 180;
// Six decimals is about 0.1 m, the precision the database stores.
export const COORDINATE_DECIMALS = 6;
// Where the map opens when a class has no location yet (Kuala Lumpur).
export const DEFAULT_CENTER = Object.freeze({ lat: 3.139, lng: 101.6869 });
export const DEFAULT_ZOOM = 12;
export const PLACED_ZOOM = 17;
// Two positions closer than this are the same point. It stops the map and the
// number inputs from answering each other forever.
const SAME_POINT_DEGREES = 1e-7;

// A finite number in range, or null. Accepts number text such as "3.1215";
// blank text, other text and values outside [min, max] give null.
export function toCoordinate(value, min, max) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max
    ? number
    : null;
}

export const toLatitude = (value) =>
  toCoordinate(value, MIN_LATITUDE, MAX_LATITUDE);
export const toLongitude = (value) =>
  toCoordinate(value, MIN_LONGITUDE, MAX_LONGITUDE);

// { lat, lng } when both are usable, otherwise null (no pin is drawn).
export function toPosition(latitude, longitude) {
  const lat = toLatitude(latitude);
  const lng = toLongitude(longitude);
  return lat === null || lng === null ? null : { lat, lng };
}

export function roundCoordinate(value) {
  const factor = 10 ** COORDINATE_DECIMALS;
  return Math.round(value * factor) / factor;
}

// A point picked on the map: rounded, and the longitude wrapped into
// -180..180 because Leaflet lets the map repeat sideways.
export function pickedPosition({ lat, lng }) {
  const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
  return {
    lat: roundCoordinate(Math.min(MAX_LATITUDE, Math.max(MIN_LATITUDE, lat))),
    lng: roundCoordinate(wrapped),
  };
}

export function samePosition(a, b) {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.lat - b.lat) < SAME_POINT_DEGREES &&
    Math.abs(a.lng - b.lng) < SAME_POINT_DEGREES
  );
}

// A radius in range, or null. Used for drawing; validation still shows the message.
export function toRadius(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) &&
    number >= MIN_RADIUS_M &&
    number <= MAX_RADIUS_M
    ? number
    : null;
}

// Messages for the "Use my current location" button.
export function geolocationMessage(code) {
  if (code === 1)
    return 'Location access was blocked. Allow it for this site, or place the pin on the map.';
  if (code === 2)
    return 'Your location could not be found. Place the pin on the map instead.';
  if (code === 3)
    return 'Finding your location took too long. Try again, or place the pin on the map.';
  return 'Your location could not be read. Place the pin on the map instead.';
}
