const express = require('express');
const router = express.Router();
const hydra = require('../services/hydra.service');
const jwtService = require('../services/jwt.service');
const pkce = require('../services/pkce.service');

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

