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
      if (!token) return next();
      const decoded = await verifyIdToken(token, { audience: options.audience });
      req.user = decoded;
      return next();
    } catch (err) {
      console.warn('token verify failed:', err && err.message ? err.message : err);
      return next();
    }
  };
};
