import { Router } from 'express';
import { config } from '../config.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    const emailContent = [
      `New Contact Form Submission`,
      `===========================`,
      `Name: ${name}`,
      `Email: ${email}`,
      `Subject: ${subject || 'N/A'}`,
      `Message: ${message}`,
      `===========================`,
      `Submitted: ${new Date().toISOString()}`,
    ].join('\n');

    async function sendEmail(to) {
      const apiRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.resend.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Octobere <noreply@octobere.com>',
          to: [to],
          subject: subject ? `New Contact: ${subject}` : 'New Contact Form Submission',
          text: emailContent,
        }),
      });
      return apiRes.ok;
    }

    const results = await Promise.allSettled([
      sendEmail('aminjosman@gmail.com'),
      sendEmail('form@octobere.com'),
    ]);

    const delivered = results.filter(r => r.status === 'fulfilled' && r.value).length;

    res.json({
      success: true,
      delivered,
      message: 'Your message has been sent successfully.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
