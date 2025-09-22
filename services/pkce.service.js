const crypto = require('crypto');

function base64url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

module.exports = {
  // use a larger random size to ensure verifier length comfortably exceeds 43 chars
  generateVerifier: () => base64url(crypto.randomBytes(64)),
  challengeFromVerifier: (verifier) => base64url(crypto.createHash('sha256').update(verifier).digest()),
};
