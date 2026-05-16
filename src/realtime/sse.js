import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const clients = new Map();

const router = Router();

router.get('/', requireAuth, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', userId: req.user.id })}\n\n`);

  const userId = req.user.id;
  if (!clients.has(userId)) clients.set(userId, []);
  clients.get(userId).push(res);

  const ping = setInterval(() => {
    res.write(':ping\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(ping);
    const userClients = clients.get(userId);
    if (userClients) {
      const idx = userClients.indexOf(res);
      if (idx !== -1) userClients.splice(idx, 1);
      if (userClients.length === 0) clients.delete(userId);
    }
  });
});

export function broadcast(userIds, event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const uid of userIds) {
    const userClients = clients.get(uid);
    if (userClients) {
      for (const client of userClients) {
        try { client.write(payload); } catch (e) { /* ignore */ }
      }
    }
  }
}

export function broadcastAll(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [, userClients] of clients) {
    for (const client of userClients) {
      try { client.write(payload); } catch (e) { /* ignore */ }
    }
  }
}

export default router;
