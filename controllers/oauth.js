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
    try {
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
