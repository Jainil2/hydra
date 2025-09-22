const express = require('express');
const router = express.Router();
const hydra = require('../services/hydra.service');
const userService = require('../services/user.service');

router.get('/login', async (req, res) => {
  const challenge = req.query.login_challenge;
  if (!challenge) return res.status(400).send('login_challenge missing');
  try {
    const { data } = await hydra.getLoginRequest(challenge);
    res.render('login', { challenge, data, env: process.env, user: req.user });
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.post('/login', async (req, res) => {
  const { challenge, username, password } = req.body;
  try {
    const valid = await userService.verify(username, password);
    if (!valid) return res.status(401).send('invalid credentials');
    const body = { subject: username, remember: false };
    const { data } = await hydra.acceptLoginRequest(challenge, body);
    return res.redirect(data.redirect_to);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.post('/seed-user', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const id = await userService.create(username, password);
    res.json({ id });
  } catch (err) {
    console.error('seed-user error:', err);
    res.status(500).json({ error: err.toString() });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await require('../services/db')('users').select('id', 'username', 'profile');
    res.json(users.map(u => ({
      id: u.id,
      username: u.username,
      profile: (u.profile && typeof u.profile === 'string') ? JSON.parse(u.profile) : (u.profile || {})
    })));
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.get('/consent', async (req, res) => {
  const challenge = req.query.consent_challenge;
  if (!challenge) return res.status(400).send('consent_challenge missing');
  try {
    const { data } = await hydra.getConsentRequest(challenge);
    res.render('consent', { challenge, data, env: process.env, user: req.user });
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.post('/consent', async (req, res) => {
  const { challenge, grant_scope } = req.body;
  try {
    const scopes = Array.isArray(grant_scope) ? grant_scope : (grant_scope ? [grant_scope] : []);
    const body = {
      grant_scope: scopes,
      // audience may be empty; Hydra expects grant_access_token_audience when present
      grant_access_token_audience: [],
      remember: false,
      // optionally provide session data for id_token/access_token; leave empty here
      session: {}
    };
    try {
      const { data } = await hydra.acceptConsentRequest(challenge, body);
      // Hydra normally returns { redirect_to: 'https://client/cb?code=...&state=...' }
      if (data && data.redirect_to) {
        return res.redirect(data.redirect_to);
      }
      // Some Hydra responses may return the code/scope/state directly.
      // If so, fetch the consent request to obtain the client's redirect URI
      if (data && data.code) {
        try {
          const consentResp = await hydra.getConsentRequest(challenge);
          const client = consentResp && consentResp.data && consentResp.data.client;
          const redirectUri = client && client.redirect_uris && client.redirect_uris[0];
          if (redirectUri) {
            const params = new URLSearchParams({ code: data.code, state: data.state, scope: data.scope });
            return res.redirect(redirectUri + (redirectUri.includes('?') ? '&' : '?') + params.toString());
          }
        } catch (e) {
          console.error('Failed to fetch consent request to reconstruct redirect URI:', e);
        }
      }
      // If we reach here, fall back to returning the raw data so the developer can inspect it
      return res.json(data);
    } catch (innerErr) {
      // if Hydra returns a 4xx, include the response body for debugging
      if (innerErr && innerErr.response) {
        console.error('Hydra acceptConsentRequest failed:', innerErr.response.status, innerErr.response.data);
        return res.status(innerErr.response.status).send(JSON.stringify(innerErr.response.data));
      }
      throw innerErr;
    }
  } catch (err) {
    console.error('consent handler error:', err);
    res.status(500).send(err.toString());
  }
});

module.exports = router;
