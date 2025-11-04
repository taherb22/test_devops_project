const express = require('express');
const client = require('prom-client');

const app = express();
const register = client.register;

// Basic metrics
const requestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests'
});

app.get('/', (req, res) => {
  requestCounter.inc();
  res.send('Hello from simple-node-app!');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
