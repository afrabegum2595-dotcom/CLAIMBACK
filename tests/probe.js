const http = require('http');
const server = require('../server');

const PORT = 3000;

server.listen(PORT, async () => {
  console.log(`Server started on port ${PORT}`);

  try {
    // Probe 1: GET /api/stats
    const stats = await get('http://localhost:3000/api/stats');
    console.log('STATS API:', stats.statusCode, stats.body.slice(0, 100));

    // Probe 2: GET / (HTML frontend)
    const indexHtml = await get('http://localhost:3000/');
    console.log('INDEX HTML:', indexHtml.statusCode, `Length: ${indexHtml.body.length}`);

    // Probe 3: GET /css/styles.css
    const css = await get('http://localhost:3000/css/styles.css');
    console.log('CSS:', css.statusCode, `Length: ${css.body.length}`);

    // Probe 4: GET /js/app.js
    const js = await get('http://localhost:3000/js/app.js');
    console.log('JS:', js.statusCode, `Length: ${js.body.length}`);

    console.log('ALL PROBES SUCCESSFUL!');
  } catch (err) {
    console.error('Probe error:', err);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      console.log('Server closed.');
      process.exit(process.exitCode || 0);
    });
  }
});

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    }).on('error', reject);
  });
}
