const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    console.log('Auth middleware - Token present:', !!token);

    if (!token) {
      console.log('Auth middleware - No token provided');
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('Auth middleware - Token decoded:', decoded);

    const user = await User.findById(decoded.userId);
    console.log('Auth middleware - User found:', !!user);

    if (!user) {
      console.log('Auth middleware - User not found');
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    req.user = user;
    console.log('Auth middleware - Authentication successful for user:', user.email);
    next();
  } catch (error) {
    console.log('Auth middleware - Token verification error:', error.message);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin role required.' });
      }
      next();
    });
  } catch (error) {
    res.status(403).json({ error: 'Admin access required.' });
  }
};

module.exports = { auth, adminAuth };
