const axios = require('axios');
const hydraConfig = require('../config/hydra');

const admin = axios.create({ baseURL: hydraConfig.adminUrl });
const pub = axios.create({ baseURL: hydraConfig.publicUrl });
const qs = (obj) => new URLSearchParams(obj).toString();

module.exports = {
  getLoginRequest: (challenge) => admin.get(`/oauth2/auth/requests/login?login_challenge=${challenge}`),
  acceptLoginRequest: (challenge, body) => admin.put(`/oauth2/auth/requests/login/accept?login_challenge=${challenge}`, body),
  rejectLoginRequest: (challenge, body) => admin.put(`/oauth2/auth/requests/login/reject?login_challenge=${challenge}`, body),

  getConsentRequest: (challenge) => admin.get(`/oauth2/auth/requests/consent?consent_challenge=${challenge}`),
  acceptConsentRequest: (challenge, body) => admin.put(`/oauth2/auth/requests/consent/accept?consent_challenge=${challenge}`, body),
  rejectConsentRequest: (challenge, body) => admin.put(`/oauth2/auth/requests/consent/reject?consent_challenge=${challenge}`, body),
  getLogoutRequest: (challenge) => admin.get(`/oauth2/auth/requests/logout?logout_challenge=${challenge}`),
  acceptLogoutRequest: (challenge, body) => admin.put(`/oauth2/auth/requests/logout/accept?logout_challenge=${challenge}`, body),
  rejectLogoutRequest: (challenge, body) => admin.put(`/oauth2/auth/requests/logout/reject?logout_challenge=${challenge}`, body),

  createClient: (body) => admin.post('/clients', body),
  getClients: () => admin.get('/clients'),

  introspectToken: (data) => pub.post('/oauth2/introspect', qs(data), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }),
  token: (data) => pub.post('/oauth2/token', qs(data), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }),
  userinfo: (headers) => pub.get('/oauth2/userinfo', { headers }),
  wellKnown: () => pub.get('/.well-known/openid-configuration'),
  jwks: () => pub.get('/.well-known/jwks.json'),
  revoke: (data) => pub.post('/oauth2/revoke', qs(data), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }),
};
