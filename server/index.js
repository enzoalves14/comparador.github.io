const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const USERS_FILE = path.join(__dirname, 'users.json');
let users = [];
try {
  users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  if (!Array.isArray(users) || users.length === 0) throw new Error('empty');
} catch (err) {
  const defaultUser = {
    id: 1,
    username: 'admin',
    password: bcrypt.hashSync('1234', 10),
    name: 'Admin',
    email: 'admin@example.com'
  };
  users = [defaultUser];
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}
const tokens = {};

app.post('/register', async (req, res) => {
  const { username, password, name, email } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'user exists' });
  }
  const id = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
  const hashed = await bcrypt.hash(password, 10);
  users.push({ id, username, password: hashed, name: name || username, email: email || '' });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.json({ status: 'ok' });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'invalid credentials' });
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
