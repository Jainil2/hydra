const express = require('express');
const router = express.Router();
const hydra = require('../services/hydra.service');
const userService = require('../services/user.service');

router.get('/login', async (req, res) => {
  const challenge = req.query.login_challenge;
  if (!challenge) return res.status(400).send('login_challenge missing');
  try {
    const { data } = await hydra.getLoginRequest(challenge);
    res.render('login', { challenge, data });
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.post('/login', async (req, res) => {
  const { challenge, username } = req.body;
  try {
    const valid = await userService.verify(username || 'demo-user', req.body.password || 'password');
    if (!valid) return res.status(401).send('invalid credentials');
    const body = { subject: username || 'demo-user', remember: false };
    const { data } = await hydra.acceptLoginRequest(challenge, body);
    return res.redirect(data.redirect_to);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.post('/seed-user', async (req, res) => {
  try {
    const { username, password } = req.body;
    const id = await userService.create(username || 'demo-user', password || 'password');
    res.json({ id });
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await require('../services/db')('users').select('id', 'username', 'profile');
    res.json(users.map(u => ({ id: u.id, username: u.username, profile: u.profile ? JSON.parse(u.profile) : {} })));
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.get('/consent', async (req, res) => {
  const challenge = req.query.consent_challenge;
  if (!challenge) return res.status(400).send('consent_challenge missing');
  try {
    const { data } = await hydra.getConsentRequest(challenge);
    res.render('consent', { challenge, data });
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.post('/consent', async (req, res) => {
  const { challenge, grant_scope } = req.body;
  try {
    const body = { grant_scope: Array.isArray(grant_scope) ? grant_scope : (grant_scope ? [grant_scope] : []), grant_access_token_audience: [], remember: false, subject: 'demo-user' };
    const { data } = await hydra.acceptConsentRequest(challenge, body);
    return res.redirect(data.redirect_to);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

module.exports = router;
