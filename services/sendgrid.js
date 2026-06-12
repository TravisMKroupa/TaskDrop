const sgMail = require('@sendgrid/mail');

async function sendEmail(subject, htmlBody) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM_EMAIL;
  const to = process.env.YOUR_EMAIL;

  if (!apiKey || !from || !to || apiKey.startsWith('your_')) {
    console.warn('[TaskDrop] SendGrid not configured, skipping email');
    return { skipped: true };
  }

  sgMail.setApiKey(apiKey);
  await sgMail.send({ to, from, subject, html: htmlBody });
  return { success: true };
}

module.exports = { sendEmail };
