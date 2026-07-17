// Explicit locale/timezone so server-rendered HTML always matches what the
// browser hydrates with — relying on toLocaleString()'s runtime-default locale
// causes a hydration mismatch when the server's locale differs from the browser's.
export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).replace(',', '') + ' UTC';
}
