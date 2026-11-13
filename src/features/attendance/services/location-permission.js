// Follows the browser's location permission for this site: 'granted',
// 'prompt' or 'denied'. Once a person blocks location, the browser does not
// ask again and the page cannot ask for it, so the page needs to know, to show
// the steps that change it and to carry on when it changes.

// Calls `onChange(state)` now and each time the permission changes. Returns
// `{ supported, stop }`. When the browser cannot tell (no Permissions API for
// location), nothing is called and `supported` is false.
export async function watchLocationPermission(
  onChange,
  nav = globalThis.navigator,
) {
  const none = { supported: false, stop() {} };
  if (!nav?.permissions?.query) return none;
  let status;
  try {
    status = await nav.permissions.query({ name: 'geolocation' });
  } catch {
    return none;
  }
  const report = () => onChange(status.state);
  report();
  status.addEventListener?.('change', report);
  return {
    supported: true,
    stop() {
      status.removeEventListener?.('change', report);
    },
  };
}

// The steps to allow location again, for a person who blocked it.
export const ALLOW_LOCATION_STEPS = [
  'Select the location or lock icon in the address bar.',
  'Set Location to Allow.',
  'Reload this page.',
];
