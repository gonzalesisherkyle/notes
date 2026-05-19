// server/src/middleware/auth.js
import jwt from 'jsonwebtoken';

// Verifies a Bearer JWT and attaches the authenticated user id to the request.
export default function authMiddleware(req, res, next) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.sub;
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
