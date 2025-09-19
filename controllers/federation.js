const express = require('express');
const router = express.Router();
const axios = require('axios');
const querystring = require('querystring');
const jwt = require('jsonwebtoken');
const hydra = require('../services/hydra.service');

const { OAUTH_GOOGLE_CLIENT_ID, OAUTH_GOOGLE_CLIENT_SECRET } = process.env;

router.get('/google', (req, res) => {
  if (!OAUTH_GOOGLE_CLIENT_ID) return res.status(400).send('Google client not configured');
  const params = {
    client_id: OAUTH_GOOGLE_CLIENT_ID,
    redirect_uri: `${req.protocol}://${req.get('host')}/federation/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state: req.query.login_challenge || '',
  };
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${querystring.stringify(params)}`;
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  const code = req.query.code;
  const state = req.query.state; // this may contain login_challenge
  try {
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', querystring.stringify({
      code,
      client_id: OAUTH_GOOGLE_CLIENT_ID,
      client_secret: OAUTH_GOOGLE_CLIENT_SECRET,
      redirect_uri: `${req.protocol}://${req.get('host')}/federation/google/callback`,
      grant_type: 'authorization_code',
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    const tokens = tokenRes.data;
    const idToken = tokens.id_token;
    const payload = jwt.decode(idToken);
    const subject = payload && payload.sub ? `google:${payload.sub}` : `google:unknown`;

    if (state) {
      // state may carry hydra login_challenge
      const login_challenge = state;
      // accept login request in Hydra with mapped subject
      const acceptBody = { subject };
      const { data } = await hydra.acceptLoginRequest(login_challenge, acceptBody);
      return res.redirect(data.redirect_to);
    }

    // No hydra login challenge — just show tokens
    res.render('result', { data: tokens });
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

module.exports = router;
