const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const HYDRA_ISSUER = process.env.HYDRA_PUBLIC_URL || 'http://localhost:4444';

const client = jwksClient({
  jwksUri: `${HYDRA_ISSUER}/.well-known/jwks.json`,
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
    const opts = {
      algorithms: ['RS256'],
      issuer: HYDRA_ISSUER,
    };
    if (audience) opts.audience = audience;
    jwt.verify(idToken, getKey, opts, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}

module.exports = { verifyIdToken };
