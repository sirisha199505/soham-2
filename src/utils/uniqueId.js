/**
 * Generates a unique 8-digit student ID using timestamp + random.
 * Collision probability is negligible; AuthContext checks and retries.
 */
export function generateUniqueId() {
  const ts   = Date.now() % 10000;
  const rand = Math.floor(Math.random() * 10000);
  const n    = ts * 10000 + rand;
  return String(n).padStart(8, '0');
}

/**
 * Formats a unique ID for display: "1234 5678"
 */
export function formatUniqueId(uid) {
  if (!uid || uid.length !== 8) return uid || '';
  return `${uid.slice(0, 4)} ${uid.slice(4)}`;
}
