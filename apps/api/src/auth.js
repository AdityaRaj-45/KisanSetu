import jwt from 'jsonwebtoken';
import { User } from './models.js';

const secret = () => process.env.JWT_SECRET;

export function issueToken(user) {
  return jwt.sign({ role: user.role, state: user.state, name: user.name }, secret(), { subject: String(user._id), expiresIn: '8h' });
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.kisansetu_token;
    if (!token) return res.status(401).json({ message: 'Authentication required.' });
    const payload = jwt.verify(token, secret());
    const user = await User.findById(payload.sub).select('name role state');
    if (!user) return res.status(401).json({ message: 'Session is no longer valid.' });
    req.user = { id: String(user._id), name: user.name, role: user.role, state: user.state };
    return next();
  } catch { return res.status(401).json({ message: 'Invalid or expired session.' }); }
}

export const allowRoles = (...roles) => (req, res, next) =>
  !req.user || !roles.includes(req.user.role) ? res.status(403).json({ message: 'Insufficient permission.' }) : next();
