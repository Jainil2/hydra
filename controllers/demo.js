const express = require('express');
const router = express.Router();
const hydra = require('../services/hydra.service');
const jwtService = require('../services/jwt.service');
const pkce = require('../services/pkce.service');
const hydraConfig = require('../config/hydra');
const axios = require('axios');

router.get('/well-known', async (req, res) => {
  try {
    const { data } = await hydra.wellKnown();
    res.json(data);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.get('/pkce', async (req, res) => {
  try {
    const verifier = pkce.generateVerifier();
    const challenge = pkce.challengeFromVerifier(verifier);
    res.json({ verifier, challenge });
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.get('/jwks', async (req, res) => {
  try {
    const { data } = await hydra.jwks();
    res.json(data);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.post('/token/introspect', async (req, res) => {
  try {
    const { data } = await hydra.introspectToken(req.body);
    res.json(data);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.post('/token', async (req, res) => {
  try {
    const { data } = await hydra.token(req.body);
    res.json(data);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.post('/token/exchange', async (req, res) => {
  try {
    const { data } = await hydra.token(req.body);
    res.json(data);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.post('/token/refresh', async (req, res) => {
  try {
    const body = { grant_type: 'refresh_token', refresh_token: req.body.refresh_token, client_id: req.body.client_id, client_secret: req.body.client_secret };
    const { data } = await hydra.token(body);
    res.json(data);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.post('/token/revoke', async (req, res) => {
  try {
    const body = { token: req.body.token, client_id: req.body.client_id, client_secret: req.body.client_secret };
    const { data } = await hydra.revoke(body);
    res.json({ revoked: true, data: data });
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.post('/exchange-pkce', async (req, res) => {
  try {
    const { code, redirect_uri, client_id, code_verifier } = req.body;
    if (!code_verifier || String(code_verifier).length < 43) {
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'PKCE code_verifier is missing or too short. It must be at least 43 characters.',
        hint: 'Click Generate PKCE again to create a fresh verifier, then retry exchange with the new code from that auth window.'
      });
    }
    // Check client token endpoint auth method and guide the user
    try {
      const { data: client } = await hydra.getClient(client_id);
      const method = client && client.token_endpoint_auth_method;
      const hasSecret = Boolean(req.body.client_secret);
      if (method === 'none' && hasSecret) {
        return res.status(400).json({
          error: 'invalid_client',
          error_description: 'This client is public (token_endpoint_auth_method=none). Do not send client_secret or Basic auth.',
          hint: 'Clear the Client Secret field and retry the exchange with code_verifier.',
        });
      }
      if (method && method !== 'none' && !hasSecret) {
        return res.status(401).json({
          error: 'invalid_client',
          error_description: 'This client is confidential and requires client authentication at the token endpoint.',
          hint: 'Provide client_secret (Basic auth) or change the client to token_endpoint_auth_method="none" for public PKCE.',
        });
      }
    } catch (e) {
      // non-blocking: continue if admin read failed
    }
    const body = { grant_type: 'authorization_code', code, redirect_uri, client_id, code_verifier };
    try {
      // Log the outgoing token request body for debugging, mask client_secret
      const loggedBody = Object.assign({}, body);
      if (loggedBody.client_secret) loggedBody.client_secret = '[REDACTED:' + String(loggedBody.client_secret).length + ' chars]';
      console.log('demo.exchange-pkce -> token request body:', loggedBody);
      console.log('PKCE diagnostics:', {
        code_len: code ? String(code).length : 0,
        verifier_len: code_verifier ? String(code_verifier).length : 0,
        redirect_uri,
        client_id,
      });
      const { data } = await hydra.token(body);
      const cookieOpts = { httpOnly: true, sameSite: 'Lax', path: '/' };
      if (data.access_token) res.cookie('access_token', data.access_token, cookieOpts);
      if (data.id_token) res.cookie('id_token', data.id_token, cookieOpts);
      return res.json(Object.assign({ session_set: Boolean(data.id_token || data.access_token) }, data));
    } catch (err) {
      if (err && err.response) {
        console.error('Hydra token exchange failed:', err.response.status, err.response.data);
        return res.status(err.response.status).json(err.response.data);
      }
      throw err;
    }
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.post('/userinfo', async (req, res) => {
  try {
    const headers = { Authorization: req.headers.authorization };
    const { data } = await hydra.userinfo(headers);
    res.json(data);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.post('/verify', async (req, res) => {
  try {
    const token = req.body && req.body.token ? String(req.body.token) : '';
    if (!token) return res.status(400).json({ error: 'token_required', message: 'Provide a token in the request body.' });
    const decoded = jwtService.decode(token);
    if (!decoded) {
      const parts = token.split('.');
      const looksLikeJwt = parts.length === 3;
      return res.json({
        error: 'not_jwt',
        message: 'Token is not a JWT (likely opaque). Use Introspection to inspect access tokens.',
        hint: 'Click Introspect in the Token Tools with client credentials.',
        token_preview: token.slice(0, 12) + '...',
        looks_like_jwt: looksLikeJwt,
      });
    }
    res.json(decoded);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.post('/verify/full', async (req, res) => {
  try {
    const token = req.body && req.body.token ? String(req.body.token) : '';
    if (!token) return res.status(400).json({ error: 'token_required', message: 'Provide a token in the request body.' });
    const decoded = await jwtService.verify(token);
    res.json(decoded);
  } catch (err) {
    // include a structured error with hint
    const status = err && err.name === 'JsonWebTokenError' ? 400 : 500;
    res.status(status).json({
      error: 'verification_failed',
      message: err && err.message ? err.message : String(err),
      hint: 'Ensure the token is a JWT issued by Hydra and not an opaque access token. Use Introspection for opaque tokens.',
    });
  }
});

module.exports = router;

// Headless PKCE test: runs auth -> login accept -> consent accept -> code -> token
// Usage: GET /demo/pkce/test-headless?client_id=demo-client&redirect_uri=http://localhost:3000/result&scope=openid%20offline&username=demo-user&password=password
router.get('/pkce/test-headless', async (req, res) => {
  const client_id = req.query.client_id || 'demo-client';
  const client_secret = req.query.client_secret || '';
  const redirect_uri = req.query.redirect_uri || 'http://localhost:3000/result';
  const scope = req.query.scope || 'openid offline';
  const username = req.query.username || 'demo-user';
  const password = req.query.password || 'password';

  const state = Math.random().toString(36).slice(2);
  const nonce = Math.random().toString(36).slice(2);
  try {
    const verifier = pkce.generateVerifier();
    const challenge = pkce.challengeFromVerifier(verifier);
    const authUrl = new URL('/oauth2/auth', hydraConfig.publicUrl);
    authUrl.search = new URLSearchParams({
      response_type: 'code', client_id, redirect_uri, scope, state, nonce,
      code_challenge: challenge, code_challenge_method: 'S256'
    }).toString();

    // Step 1: hit authorize and capture redirect to our login with login_challenge
    const r1 = await axios.get(authUrl.toString(), { maxRedirects: 0, validateStatus: () => true });
    const loc1 = r1.headers && r1.headers.location ? r1.headers.location : '';
    const u1 = new URL(loc1);
    const login_challenge = u1.searchParams.get('login_challenge');
    if (!login_challenge) return res.status(500).json({ error: 'no_login_challenge', location: loc1 });

  // Step 2: Accept login via admin and follow the provided redirect_to URL
  const acceptLogin = await hydra.acceptLoginRequest(login_challenge, { subject: username, remember: false });
  const continueAfterLogin = acceptLogin && acceptLogin.data && acceptLogin.data.redirect_to ? acceptLogin.data.redirect_to : null;
  if (!continueAfterLogin) return res.status(500).json({ error: 'no_login_redirect', message: 'Hydra did not return redirect_to after accepting login.' });

  // Step 3: Follow redirect_to to trigger consent challenge
  const r2 = await axios.get(continueAfterLogin, { maxRedirects: 0, validateStatus: () => true });
    const loc2 = r2.headers && r2.headers.location ? r2.headers.location : '';
    const u2 = new URL(loc2);
    const consent_challenge = u2.searchParams.get('consent_challenge');
  if (!consent_challenge) return res.status(500).json({ error: 'no_consent_challenge', location: loc2 });

    // Step 4: Accept consent
    const scopes = scope.split(/\s+/).filter(Boolean);
    const acceptBody = { grant_scope: scopes, remember: false, grant_access_token_audience: [], session: {} };
    const { data: acceptData } = await hydra.acceptConsentRequest(consent_challenge, acceptBody);
    const loc3 = acceptData && acceptData.redirect_to ? acceptData.redirect_to : '';
    if (!loc3) return res.status(500).json({ error: 'no_redirect_to_after_consent' });

    // Step 5: Parse code from client redirect URL
    const u3 = new URL(loc3);
    const code = u3.searchParams.get('code');
    const state2 = u3.searchParams.get('state');
    if (!code) return res.status(500).json({ error: 'no_code_returned', redirect: loc3 });

    // Step 6: Exchange code with PKCE
    const tokenBody = { grant_type: 'authorization_code', code, redirect_uri, client_id, code_verifier: verifier };
    if (client_secret) tokenBody.client_secret = client_secret;
    const { data: tokenData } = await hydra.token(tokenBody);

    return res.json({
      ok: true,
      debug: {
        authUrl: authUrl.toString(),
        login_challenge,
        consent_challenge,
        code_len: code.length,
        verifier_len: verifier.length,
        state_in: state,
        state_out: state2,
      },
      token: Object.assign({}, tokenData, { access_token_preview: tokenData.access_token ? tokenData.access_token.slice(0, 16) + '...' : null })
    });
  } catch (err) {
    if (err && err.response) {
      return res.status(err.response.status).json({ error: 'http', status: err.response.status, data: err.response.data });
    }
    return res.status(500).json({ error: 'exception', message: err && err.message ? err.message : String(err) });
  }
});

