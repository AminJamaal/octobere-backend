import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { config } from '../config.js';

const router = Router();

router.post('/', requireAuth, requireRole('admin', 'superadmin', 'staff'), async (req, res) => {
  try {
    const { client_name, request_type, description } = req.body;

    const alertText = [
      `\u{1F6A8} *NEW OCTOBERE REQUEST* \u{1F6A8}`,
      ``,
      `*Client:* ${client_name || 'Unknown'}`,
      `*Request:* ${request_type || 'General'}`,
      `*Details:* ${description || 'No description provided.'}`,
      ``,
      `Log in to the Admin Hub to orchestrate.`,
    ].join('\n');

    if (!config.twilio.sid || !config.twilio.authToken) {
      return res.status(500).json({ success: false, error: 'Twilio credentials not configured' });
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.twilio.sid}/Messages.json`;
    const twilioAuth = Buffer.from(`${config.twilio.sid}:${config.twilio.authToken}`).toString('base64');

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: 'whatsapp:+14155238886',
        To: config.twilio.toNumber,
        Body: alertText,
      }),
    });

    if (!twilioRes.ok) {
      const errText = await twilioRes.text();
      throw new Error(`Twilio error: ${errText}`);
    }

    res.json({ success: true, message: 'WhatsApp alert sent successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
