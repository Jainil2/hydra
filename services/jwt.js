const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const rawIssuer = process.env.HYDRA_PUBLIC_URL || 'http://localhost:4444';
const HYDRA_ISSUER = rawIssuer;

const client = jwksClient({
  // This line will be changed to safely construct the URL
  jwksUri: new URL('/.well-known/jwks.json', HYDRA_ISSUER).toString(),
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const pub = key.getPublicKey();
    callback(null, pub);
  });
}

async function verifyIdToken(idToken, { audience } = {}) {
  return new Promise((resolve, reject) => {
    const baseOpts = { algorithms: ['RS256'] };
    const tryVerify = (issuerToUse, cb) => {
      const opts = Object.assign({}, baseOpts, { issuer: issuerToUse });
      if (audience) opts.audience = audience;
      jwt.verify(idToken, getKey, opts, cb);
    };

    // First, try using configured HYDRA_ISSUER (ensure no trailing slash)
    tryVerify(HYDRA_ISSUER, (err, decoded) => {
      if (!err) return resolve(decoded);

      // If issuer validation failed, attempt to decode token to read `iss` claim
      const decodedUnverified = jwt.decode(idToken);
      const tokenIss = decodedUnverified && decodedUnverified.iss ? (decodedUnverified.iss.endsWith('/') ? decodedUnverified.iss.slice(0, -1) : decodedUnverified.iss) : null;
      if (tokenIss && tokenIss !== HYDRA_ISSUER) {
        // Try verifying again using the token's issuer value
        tryVerify(tokenIss, (err2, decoded2) => {
          if (!err2) {
            console.warn('verifyIdToken: token issuer differs from configured HYDRA_PUBLIC_URL', { configured: HYDRA_ISSUER, token_iss: decodedUnverified.iss });
            return resolve(decoded2);
          }
          // return a helpful error including decoded claims for debugging
          const e = new Error('Token verification failed for both configured issuer and token issuer: ' + (err2 && err2.message));
          e.original = err2;
          e.decoded = decodedUnverified;
          return reject(e);
        });
      } else {
        // No alternate issuer available or same as configured - return original error with decoded payload if present
        const e = new Error('Token verification failed: ' + (err && err.message));
        e.original = err;
        e.decoded = decodedUnverified || null;
        return reject(e);
      }
    });
  });
}

module.exports = { verifyIdToken };
