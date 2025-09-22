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
  getClient: (id) => admin.get(`/clients/${encodeURIComponent(id)}`),

  introspectToken: (data) => pub.post('/oauth2/introspect', qs(data), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }),
  token: (data) => {
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    const opts = { headers };
    // Log PKCE-related fields to help diagnose missing inputs
    try {
      const dbg = {
        grant_type: data && data.grant_type,
        has_code: Boolean(data && data.code),
        redirect_uri: data && data.redirect_uri,
        client_id: data && data.client_id,
        code_verifier_len: data && data.code_verifier ? String(data.code_verifier).length : 0,
        uses_basic_auth: Boolean(data && data.client_id && data.client_secret),
      };
      console.log('hydra.service.token debug:', dbg);
    } catch (_) {}
    // If client_secret is provided, use HTTP Basic auth as many OAuth servers require
    if (data && data.client_id && data.client_secret) {
      const token = Buffer.from(`${data.client_id}:${data.client_secret}`).toString('base64');
      opts.headers.Authorization = `Basic ${token}`;
      // remove client_secret from body when using basic auth
      const body = Object.assign({}, data);
      const masked = Object.assign({}, body);
      if (masked.client_secret) masked.client_secret = '[REDACTED]';
      delete body.client_secret;
      console.log('hydra.service.token using Basic auth. body:', masked);
      return pub.post('/oauth2/token', qs(body), opts);
    }
    return pub.post('/oauth2/token', qs(data), opts);
  },
  userinfo: (headers) => pub.get('/oauth2/userinfo', { headers }),
  wellKnown: () => pub.get('/.well-known/openid-configuration'),
  jwks: () => pub.get('/.well-known/jwks.json'),
  revoke: (data) => pub.post('/oauth2/revoke', qs(data), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }),
};
