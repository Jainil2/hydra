const { verifyIdToken } = require('../services/jwt');

function getTokenFromReq(req) {
  const cookieToken = req.cookies && req.cookies.id_token;
  const authHeader = req.get('authorization');
  const bearer = authHeader && authHeader.split(' ')[1];
  return cookieToken || bearer || null;
}

module.exports = function attachUser(options = {}) {
  return async function (req, res, next) {
    try {
      const token = getTokenFromReq(req);
      console.log('[Auth Middleware] Token from request:', token ? `found ${token.substring(0, 15)}...` : 'not found');
      if (!token) return next();
      const decoded = await verifyIdToken(token, { audience: options.audience });
      console.log('[Auth Middleware] Token verified successfully. Decoded claims:', decoded);
      req.user = decoded;
      return next();
    } catch (err) {
      console.error('[Auth Middleware] Token verification failed:', err);
      return next();
    }
  };
};
