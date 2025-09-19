const crypto = require('crypto');

function base64url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

module.exports = {
  generateVerifier: () => base64url(crypto.randomBytes(32)),
  challengeFromVerifier: (verifier) => base64url(crypto.createHash('sha256').update(verifier).digest()),
};
