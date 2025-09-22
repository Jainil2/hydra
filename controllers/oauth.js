const express = require('express');
const router = express.Router();
const hydra = require('../services/hydra.service');

router.get('/callback', async (req, res) => {
  // Hydra redirects to client redirect_uri; this route is provided to show code and exchange easily
  const { code, state } = req.query;
  res.render('callback', { code, state });
});

router.post('/exchange', async (req, res) => {
  try {
    const body = req.body; // expects grant_type=authorization_code & code & redirect_uri & client_id & client_secret (& code_verifier optional)
    // PKCE diagnostics
    try {
      const logged = Object.assign({}, body);
      if (logged.client_secret) logged.client_secret = '[REDACTED:' + String(logged.client_secret).length + ' chars]';
      console.log('oauth.exchange incoming body keys:', Object.keys(body));
      console.log('oauth.exchange incoming body (sanitized):', logged);
      if (typeof body.code_verifier !== 'undefined') {
        console.log('oauth.exchange PKCE: code_verifier length =', String(body.code_verifier || '').length);
      } else {
        console.log('oauth.exchange PKCE: NO code_verifier present (if this was a PKCE auth, exchange will fail).');
      }
    } catch (e) { /* noop */ }
    try {
      // If PKCE is used but no client_secret provided, check client auth method and hint accordingly
      if (body && body.client_id && body.code_verifier && !body.client_secret) {
        try {
          const { data: client } = await hydra.getClient(body.client_id);
          const method = client && client.token_endpoint_auth_method;
          if (method && method !== 'none') {
            console.warn('oauth.exchange: confidential client without secret on token request', { client_id: body.client_id, method });
            return res.status(401).json({
              error: 'invalid_client',
              error_description: 'Client authentication required. This client is configured as confidential.',
              hint: 'Either include client_secret (Basic auth) in the token request or update the client to token_endpoint_auth_method="none" for public PKCE.',
              how_to_fix: {
                curl_update_client: `curl -X PUT ${process.env.HYDRA_ADMIN_URL || 'http://localhost:4445'}/clients/${encodeURIComponent(body.client_id)} -H 'Content-Type: application/json' -d '{"token_endpoint_auth_method":"none"}'`
              }
            });
          }
        } catch (_) {}
      }
      const { data } = await hydra.token(body);
  console.log('oauth.exchange -> hydra token response:', Object.keys(data));
  const cookieOpts = { httpOnly: true, sameSite: 'Lax', path: '/' };
  if (data.access_token) res.cookie('access_token', data.access_token, cookieOpts);
  if (data.id_token) res.cookie('id_token', data.id_token, cookieOpts);
      return res.redirect('/dashboard');
    } catch (err) {
      if (err && err.response) {
        console.error('Token exchange failed:', err.response.status, err.response.data);
        return res.status(err.response.status).send(JSON.stringify(err.response.data));
      }
      throw err;
    }
  } catch (err) {
    console.error('oauth exchange handler error:', err);
    res.status(500).send(err.toString());
  }
});

module.exports = router;
