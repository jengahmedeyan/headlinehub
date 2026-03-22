// scripts/setup-webhook.ts
import axios from 'axios';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = `${process.env.VERCEL_URL}/api/bot/webhook`;

async function setupWebhook() {
  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        url: WEBHOOK_URL,
        allowed_updates: ['message', 'callback_query']
      }
    );
    
    console.log('Webhook setup response:', response.data);
  } catch (error) {
    console.error('Failed to setup webhook:', error);
  }
}

setupWebhook();