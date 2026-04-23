/**
 * Generates a deterministic 8-digit unique student ID
 * based on name, roll number, and class name.
 * Same inputs always produce the same ID.
 */
export function generateUniqueId(name, rollNo, className) {
  const str = [name, rollNo, className]
    .map(s => s.trim().toLowerCase())
    .join('|');

  // djb2 hash → positive 8-digit number
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(hash, 33) ^ str.charCodeAt(i);
  }

  // Force positive and clamp to 8 digits
  const positive = (hash >>> 0) % 100000000;
  return String(positive).padStart(8, '0');
}

/**
 * Formats a unique ID for display: "1234 5678"
 */
export function formatUniqueId(uid) {
  if (!uid || uid.length !== 8) return uid || '';
  return `${uid.slice(0, 4)} ${uid.slice(4)}`;
}
