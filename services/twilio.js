const twilio = require('twilio');

async function sendSMS(message) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  const to = process.env.YOUR_PHONE_NUMBER;

  if (!sid || !token || !from || !to || sid.startsWith('your_')) {
    console.warn('[TaskDrop] Twilio not configured, skipping SMS');
    return { skipped: true };
  }

  const client = twilio(sid, token);
  await client.messages.create({ body: message, from, to });
  return { success: true };
}

module.exports = { sendSMS };
