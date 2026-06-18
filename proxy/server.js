const express = require('express');
const request = require('request');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

app.get('/proxy', (req, res) => {
  const url = req.query.url;

  if (!url || typeof url !== 'string') {
    return res.status(400).send('Missing or invalid url parameter');
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    const validProtocols = ['http://', 'https://'];
    if (!validProtocols.some((p) => decodedUrl.startsWith(p))) {
      return res.status(400).send('Invalid URL protocol');
    }

    const proxyReq = request({
      url: decodedUrl,
      encoding: null,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    proxyReq.on('response', (response) => {
      const contentType = response.headers['content-type'] || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err.message);
      if (!res.headersSent) {
        res.status(502).send('Image proxy failed');
      }
    });

    proxyReq.pipe(res);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).send('Internal server error');
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cors-image-proxy' });
});

app.listen(PORT, () => {
  console.log(`CORS Image Proxy running on port ${PORT}`);
});
