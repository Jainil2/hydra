const express = require('express');
const router = express.Router();
const hydra = require('../services/hydra.service');

router.get('/manage', (req, res) => {
  res.render('clients');
});

router.post('/create', async (req, res) => {
  try {
    const client = req.body;
    const { data } = await hydra.createClient(client);
    res.json(data);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

router.get('/', async (req, res) => {
  try {
    const { data } = await hydra.getClients();
    res.json(data);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

module.exports = router;
