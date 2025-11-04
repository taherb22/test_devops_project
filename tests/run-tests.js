/* Simple test runner without external deps */
const http = require('http');
const assert = require('assert');
const app = require('../index');

function startServer() {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, port });
    });
    server.on('error', reject);
  });
}

function httpRequest({ method = 'GET', path = '/', port }) {
  return new Promise((resolve, reject) => {
    const options = { method, port, path, hostname: '127.0.0.1' };
    const req = http.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const results = [];
  const record = async (name, fn) => {
    try {
      await fn();
      results.push({ name, ok: true });
    } catch (err) {
      results.push({ name, ok: false, err });
    }
  };

  const { server, port } = await startServer();

  try {
    await record('GET / returns greeting', async () => {
      const res = await httpRequest({ path: '/', port });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.includes('Hello from simple-node-app!'));
    });

    await record('GET /health returns ok JSON', async () => {
      const res = await httpRequest({ path: '/health', port });
      assert.strictEqual(res.status, 200);
      const json = JSON.parse(res.body);
      assert.strictEqual(json.status, 'ok');
    });

    await record('GET /metrics exposes Prometheus metrics', async () => {
      // first hit / to ensure our custom counter is registered and incremented
      await httpRequest({ path: '/', port });
      const res = await httpRequest({ path: '/metrics', port });
      assert.strictEqual(res.status, 200);
      assert.ok(/text\/plain/.test(res.headers['content-type'] || ''));
      // Check for our metric name or any standard process metric as fallback
      assert.ok(
        res.body.includes('http_requests_total') ||
          res.body.includes('process_cpu_user_seconds_total'),
        'expected metrics to contain http_requests_total or process metrics'
      );
    });
  } finally {
    await new Promise((r) => server.close(r));
  }

  // Report
  const failed = results.filter((r) => !r.ok);
  results.forEach((r) => {
    if (r.ok) console.log(`✓ ${r.name}`);
    else {
      console.error(`✗ ${r.name}`);
      console.error(r.err && (r.err.stack || r.err.message || r.err));
    }
  });

  if (failed.length) {
    process.exitCode = 1;
  } else {
    console.log(`\nAll ${results.length} tests passed.`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
