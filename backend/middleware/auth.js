const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    console.warn(`[auth] 401 – No token on ${req.method} ${req.path}`);
    return res.status(401).json({ error: 'No token provided' });
  }
  if (!process.env.JWT_SECRET) {
    console.error('[auth] JWT_SECRET is not set!');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch (err) {
    console.warn(`[auth] 401 – Invalid token on ${req.method} ${req.path}: ${err.message}`);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Allowed roles for admin-level API access
const ADMIN_ROLES = ['admin', 'super_admin', 'school_admin', 'district_admin', 'teacher'];

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      console.warn(`[auth] 403 – Role '${req.user.role}' not in admin roles on ${req.method} ${req.path}`);
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
