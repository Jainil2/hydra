const express = require('express');
const router = express.Router();
const hydra = require('../services/hydra.service');
const hydraConfig = require('../config/hydra');

router.get('/', async (req, res) => {
  const challenge = req.query.logout_challenge;
  // Proactively clear local cookies so header won't show username after redirect
  res.clearCookie('id_token', { httpOnly: true, sameSite: 'Lax', path: '/' });
  res.clearCookie('access_token', { httpOnly: true, sameSite: 'Lax', path: '/' });
  if (!challenge) {
    // If no challenge provided, initiate Hydra's RP-initiated logout flow
    const url = new URL('/oauth2/sessions/logout', hydraConfig.publicUrl);
    const idToken = req.cookies && req.cookies.id_token;
    if (idToken) {
      url.searchParams.set('id_token_hint', idToken);
      const postLogout = process.env.POST_LOGOUT_REDIRECT_URL || 'http://localhost:3000/';
      url.searchParams.set('post_logout_redirect_uri', postLogout);
    }
    return res.redirect(url.toString());
  }
  try {
    const { data } = await hydra.getLogoutRequest(challenge);
    res.render('logout', { challenge, data, env: process.env, user: req.user });
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.post('/', async (req, res) => {
  const { challenge } = req.body || {};
  try {
    // Always clear local app cookies
    res.clearCookie('id_token', { httpOnly: true, sameSite: 'Lax', path: '/' });
    res.clearCookie('access_token', { httpOnly: true, sameSite: 'Lax', path: '/' });

    // If we don't have a challenge (e.g., logout triggered directly), just go home
    if (!challenge) {
      return res.redirect('/');
    }

    const { data } = await hydra.acceptLogoutRequest(challenge, {});
    return res.redirect(data.redirect_to);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

module.exports = router;
