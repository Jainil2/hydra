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
    const body = { grant_type: 'authorization_code', code, redirect_uri, client_id, code_verifier };
    const { data } = await hydra.token(body);
    res.json(data);
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
    const decoded = jwtService.decode(req.body.token);
    res.json(decoded);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.post('/verify/full', async (req, res) => {
  try {
    const decoded = await jwtService.verify(req.body.token);
    res.json(decoded);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

module.exports = router;

