require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const authRoutes = require('./controllers/auth');
const demoRoutes = require('./controllers/demo');
const clientsRoutes = require('./controllers/clients');
const attachUser = require('./middleware/auth');

const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// attach decoded user (if id_token cookie or Authorization header present)
app.use(attachUser());

app.get('/session', (req, res) => {
  const id = req.cookies && req.cookies.id_token;
  if (!id) return res.json({ loggedIn: false });
  // do a simple base64 decode to show claims (no verification here)
  try {
    const parts = id.split('.');
    const claims = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return res.json({ loggedIn: true, claims });
  } catch (e) {
    return res.json({ loggedIn: false });
  }
});

app.get('/', (req, res) => res.render('index', { env: process.env, user: req.user }));
app.get('/flows', (req, res) => res.render('flows', { env: process.env, user: req.user }));
app.get('/pkce', (req, res) => res.render('pkce', { env: process.env, user: req.user }));
app.get('/users/manage', (req, res) => res.render('users', { env: process.env, user: req.user }));
app.use('/auth', authRoutes);
app.use('/demo', demoRoutes);
app.use('/clients', clientsRoutes);

const oauthRoutes = require('./controllers/oauth');
const logoutRoutes = require('./controllers/logout');
const federationRoutes = require('./controllers/federation');

app.use('/oauth', oauthRoutes);
app.use('/auth/logout', logoutRoutes);
app.use('/federation', federationRoutes);

app.get('/dashboard', (req, res) => {
  const claims = req.user || null;
  res.render('dashboard', { user: claims, env: process.env });
});

app.get('/result', (req, res) => {
  res.render('result', { data: req.query });
});

// Development helper: decode id_token cookie using JWKS (returns decoded claims)
app.get('/debug/decode', async (req, res) => {
  try {
    const idToken = req.cookies && req.cookies.id_token;
    if (!idToken) return res.status(400).json({ error: 'no id_token cookie' });
    const decoded = await require('./services/jwt').verifyIdToken(idToken, { audience: process.env.FLOW_CLIENT_ID || undefined });
    return res.json({ decoded });
  } catch (err) {
    return res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
});

// Dev: dump received cookies for debugging
app.get('/debug/cookies', (req, res) => {
  res.json({ cookies: req.cookies });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Hydra playground running at http://localhost:${port}`));
