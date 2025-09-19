const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const hydraConfig = require('../config/hydra');

const client = jwksClient({ jwksUri: `${hydraConfig.publicUrl}/.well-known/jwks.json` });

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

module.exports = {
  decode: (token) => jwt.decode(token, { complete: true }),
  verify: (token) => new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {}, (err, decoded) => err ? reject(err) : resolve(decoded));
  }),
};
