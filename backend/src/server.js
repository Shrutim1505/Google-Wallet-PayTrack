import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../data');
const receiptsPath = path.join(dataDir, 'receipts.json');
const usersPath = path.join(dataDir, 'users.json');
const settingsPath = path.join(dataDir, 'settings.json');

const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(receiptsPath)) fs.writeFileSync(receiptsPath, '[]');
  if (!fs.existsSync(usersPath)) {
    const demoUser = [{ id: 'demo-user-123', email: 'demo@example.com', password: 'password', name: 'Demo User' }];
    fs.writeFileSync(usersPath, JSON.stringify(demoUser, null, 2));
  }
  if (!fs.existsSync(settingsPath)) {
    const defaultSettings = {
      'demo-user-123': {
        name: 'Demo User',
        email: 'demo@example.com',
        monthlyBudget: 50000,
        notificationsEnabled: true,
        darkMode: false,
      },
    };
    fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
  }
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseJsonBody(buffer) {
  try {
    return JSON.parse(buffer.toString('utf-8'));
  } catch {
    return null;
  }
}

function parseMultipartFile(buffer, contentType = '') {
  const boundaryMatch = contentType.match(/boundary=(.+)$/);
  if (!boundaryMatch) return null;
  const boundary = `--${boundaryMatch[1]}`;
  const payload = buffer.toString('binary');
  const parts = payload.split(boundary).filter((part) => part.includes('Content-Disposition'));

  for (const part of parts) {
    if (!part.includes('name="file"')) continue;
    const filenameMatch = part.match(/filename="([^"]+)"/);
    const typeMatch = part.match(/Content-Type:\s*([^\r\n]+)/i);
    const splitIndex = part.indexOf('\r\n\r\n');
    if (splitIndex < 0) continue;

    const contentBinary = part.slice(splitIndex + 4).replace(/\r\n--?$/, '').replace(/\r\n$/, '');
    const contentBuffer = Buffer.from(contentBinary, 'binary');

    return {
      filename: filenameMatch?.[1] || `receipt-${Date.now()}.bin`,
      contentType: typeMatch?.[1]?.trim() || 'application/octet-stream',
      size: contentBuffer.length,
    };
  }

  return null;
}

function getUserFromAuth(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res) {
  const user = getUserFromAuth(req);
  if (!user) {
    sendJson(res, 401, { message: 'Unauthorized' });
    return null;
  }
  return user;
}

function normalizeReceipt(input, userId) {
  const date = input.date || new Date().toISOString().split('T')[0];
  return {
    id: input.id || randomUUID(),
    userId,
    merchant: input.merchant || 'Unknown Merchant',
    amount: Number(input.amount) || 0,
    date,
    category: input.category || 'Uncategorized',
    items: Array.isArray(input.items) ? input.items : [],
  };
}

function handleAuthLogin(req, res, body) {
  const users = readJson(usersPath, []);
  const { email, password } = body || {};
  const found = users.find((u) => u.email === email && u.password === password);

  if (!found) {
    sendJson(res, 401, { message: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign({ userId: found.id, email: found.email, name: found.name }, JWT_SECRET, { expiresIn: '24h' });
  sendJson(res, 200, { data: { user: { id: found.id, email: found.email, name: found.name }, token } });
}

function handleAuthRegister(req, res, body) {
  const users = readJson(usersPath, []);
  const { email, password, name } = body || {};
  if (!email || !password) {
    sendJson(res, 400, { message: 'Email and password are required' });
    return;
  }
  if (users.some((u) => u.email === email)) {
    sendJson(res, 409, { message: 'User already exists' });
    return;
  }

  const user = { id: randomUUID(), email, password, name: name || email.split('@')[0] };
  users.push(user);
  writeJson(usersPath, users);

  const token = jwt.sign({ userId: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  sendJson(res, 201, { data: { user: { id: user.id, email: user.email, name: user.name }, token } });
}

async function serverHandler(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const { pathname } = url;

  if (pathname === '/health') {
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = parseJsonBody(await parseBody(req));
    handleAuthLogin(req, res, body);
    return;
  }

  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const body = parseJsonBody(await parseBody(req));
    handleAuthRegister(req, res, body);
    return;
  }

  const authUser = requireAuth(req, res);
  if (!authUser) return;
  const userId = authUser.userId;

  if (pathname === '/api/receipts' && req.method === 'GET') {
    const receipts = readJson(receiptsPath, []).filter((r) => r.userId === userId);
    sendJson(res, 200, { data: receipts });
    return;
  }

  if (pathname === '/api/receipts' && req.method === 'POST') {
    const payload = parseJsonBody(await parseBody(req));
    if (!payload) {
      sendJson(res, 400, { message: 'Invalid JSON body' });
      return;
    }

    const receipts = readJson(receiptsPath, []);
    const created = normalizeReceipt(payload, userId);
    receipts.unshift(created);
    writeJson(receiptsPath, receipts);
    sendJson(res, 201, { data: created });
    return;
  }

  if (pathname.startsWith('/api/receipts/') && pathname !== '/api/receipts/upload') {
    const receiptId = pathname.split('/').pop();
    const receipts = readJson(receiptsPath, []);
    const index = receipts.findIndex((r) => r.id === receiptId && r.userId === userId);

    if (index === -1) {
      sendJson(res, 404, { message: 'Receipt not found' });
      return;
    }

    if (req.method === 'GET') {
      sendJson(res, 200, { data: receipts[index] });
      return;
    }

    if (req.method === 'PUT') {
      const updates = parseJsonBody(await parseBody(req));
      receipts[index] = normalizeReceipt({ ...receipts[index], ...updates, id: receipts[index].id }, userId);
      writeJson(receiptsPath, receipts);
      sendJson(res, 200, { data: receipts[index] });
      return;
    }

    if (req.method === 'DELETE') {
      receipts.splice(index, 1);
      writeJson(receiptsPath, receipts);
      sendJson(res, 200, { data: { deleted: true } });
      return;
    }
  }

  if (pathname === '/api/receipts/upload' && req.method === 'POST') {
    const bodyBuffer = await parseBody(req);
    const file = parseMultipartFile(bodyBuffer, req.headers['content-type']);
    if (!file) {
      sendJson(res, 400, { message: 'File upload is required' });
      return;
    }

    const name = file.filename.replace(/\.[^/.]+$/, '');
    const generated = normalizeReceipt(
      {
        merchant: name || 'Uploaded Receipt',
        amount: Math.floor(Math.random() * 4000) + 100,
        category: 'Uncategorized',
        items: [{ name: 'Scanned item', price: 100, quantity: 1 }],
      },
      userId
    );

    const receipts = readJson(receiptsPath, []);
    receipts.unshift(generated);
    writeJson(receiptsPath, receipts);

    sendJson(res, 201, { data: generated });
    return;
  }

  if (pathname === '/api/settings' && req.method === 'GET') {
    const allSettings = readJson(settingsPath, {});
    const settings = allSettings[userId] || {
      name: authUser.name || 'User',
      email: authUser.email,
      monthlyBudget: 50000,
      notificationsEnabled: true,
      darkMode: false,
    };
    sendJson(res, 200, { data: settings });
    return;
  }

  if (pathname === '/api/settings' && req.method === 'PUT') {
    const updates = parseJsonBody(await parseBody(req));
    if (!updates) {
      sendJson(res, 400, { message: 'Invalid JSON body' });
      return;
    }

    const allSettings = readJson(settingsPath, {});
    const current = allSettings[userId] || {};
    allSettings[userId] = { ...current, ...updates };
    writeJson(settingsPath, allSettings);

    sendJson(res, 200, { data: allSettings[userId] });
    return;
  }

  if (pathname === '/api/analytics' && req.method === 'GET') {
    const receipts = readJson(receiptsPath, []).filter((r) => r.userId === userId);
    const total = receipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const byCategory = Object.entries(
      receipts.reduce((acc, r) => {
        const key = r.category || 'Uncategorized';
        acc[key] = (acc[key] || 0) + Number(r.amount || 0);
        return acc;
      }, {})
    ).map(([category, amount]) => ({ category, amount }));

    sendJson(res, 200, { data: { totalSpent: total, receiptsCount: receipts.length, categories: byCategory } });
    return;
  }

  sendJson(res, 404, { message: 'Route not found' });
}

ensureDataFiles();

const server = http.createServer((req, res) => {
  serverHandler(req, res).catch((error) => {
    console.error('Unhandled server error:', error);
    sendJson(res, 500, { message: 'Internal server error' });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});
