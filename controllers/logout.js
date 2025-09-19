const express = require('express');
const router = express.Router();
const hydra = require('../services/hydra.service');

router.get('/', async (req, res) => {
  const challenge = req.query.logout_challenge;
  if (!challenge) return res.send('No logout_challenge provided');
  try {
    const { data } = await hydra.getLogoutRequest(challenge);
    res.render('logout', { challenge, data });
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.post('/', async (req, res) => {
  const { challenge } = req.body;
  try {
    const { data } = await hydra.acceptLogoutRequest(challenge, {});
    res.redirect(data.redirect_to);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

module.exports = router;
