const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/v1/auth/test', (req, res) => {
  res.json({ status: 'ok', message: 'Auth endpoint working' });
});

module.exports = app;
