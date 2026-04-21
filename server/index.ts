import 'dotenv/config';
import path from 'path';
import express from 'express';
import { getJson, getPasscode, KEYS, setJson, setPasscode } from './db';

const app = express();
const PORT = Number(process.env.PORT || process.env.API_PORT || 8787);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '100mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/data', (_req, res) => {
  try {
    res.json({
      buildings: getJson(KEYS.buildings, []),
      userProfiles: getJson(KEYS.userProfiles, []),
      lidarScans: getJson(KEYS.lidarScans, []),
      passcode: getPasscode(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

app.put('/api/buildings', (req, res) => {
  try {
    setJson(KEYS.buildings, req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save buildings' });
  }
});

app.put('/api/user-profiles', (req, res) => {
  try {
    setJson(KEYS.userProfiles, req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save user profiles' });
  }
});

app.put('/api/lidar-scans', (req, res) => {
  try {
    setJson(KEYS.lidarScans, req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save LiDAR scans' });
  }
});

app.put('/api/passcode', (req, res) => {
  try {
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode : '';
    if (!passcode) {
      res.status(400).json({ error: 'passcode required' });
      return;
    }
    setPasscode(passcode);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save passcode' });
  }
});

if (isProd) {
  const dist = path.join(process.cwd(), 'dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[medama-api] listening on ${PORT} (${isProd ? 'production' : 'development'})`);
});
