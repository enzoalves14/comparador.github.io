const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const users = [
  { id: 1, username: 'admin', password: '1234', name: 'Admin', email: 'admin@example.com' }
];
const tokens = {};

app.post('/register', (req, res) => {
  const { username, password, name, email } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'user exists' });
  }
  const id = users.length + 1;
  users.push({ id, username, password, name: name || username, email: email || '' });
  res.json({ status: 'ok' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const token = crypto.randomBytes(16).toString('hex');
  tokens[token] = user.id;
  res.json({ token });
});

function auth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.split(' ')[1];
  if (token && tokens[token]) {
    req.user = users.find(u => u.id === tokens[token]);
    return next();
  }
  res.status(401).json({ error: 'unauthorized' });
}

app.get('/me', auth, (req, res) => {
  const { password, ...user } = req.user;
  res.json(user);
});

app.use(express.static(path.join(__dirname, '..')));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
