const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certificates', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certificates', 'cert.pem')),
};

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, hostname, () => {
      const networkInterfaces = require('os').networkInterfaces();
      let localIP = 'localhost';
      
      for (const name of Object.keys(networkInterfaces)) {
        for (const net of networkInterfaces[name]) {
          if (net.family === 'IPv4' && !net.internal) {
            localIP = net.address;
            break;
          }
        }
      }
      
      console.log(`
  ▲ Next.js with HTTPS
  - Local:    https://localhost:${port}
  - Network:  https://${localIP}:${port}
  
  ⚠️  On your iPhone:
  1. Open Safari and go to: https://${localIP}:${port}
  2. You'll see a security warning - tap "Show Details"
  3. Tap "visit this website"
  4. Tap "Visit Website" to confirm
  5. The camera should now work!
      `);
    });
});
