const { verifyToken } = require('../utils/jwt');

const protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Not authorized, token missing.' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ status: 'error', message: 'Not authorized, token invalid or expired.' });
  }

  req.user = decoded; // Contains id, email, role, voter_id, name
  next();
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ status: 'error', message: 'Access denied. Administrators only.' });
  }
};

module.exports = {
  protect,
  adminOnly
};
