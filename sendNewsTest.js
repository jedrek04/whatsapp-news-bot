import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.PHONE_NUMBER_ID;
const TEST_USER = "48532771329"; // your WhatsApp number for testing

// Example summarized article
const article = {
  title: "Belarus President Lukashenko calls for clearer crypto framework",
  summary: "Belarus' president urges for more transparent regulations on cryptocurrencies to attract investment and reduce illegal activity.",
  url: "https://cointelegraph.com/news/belarus-president-lukashenko-makes-another-crypto-push",
};

async function sendWhatsAppMessage(userNumber, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: userNumber,
        type: "text",
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ Message sent!");
  } catch (err) {
    console.error("❌ Error sending message:", err.response?.data || err.message);
  }
}

// Format message
const message = `📰 ${article.title}\n\n${article.summary}\n\nSource: ${article.url}`;

// Send it
sendWhatsAppMessage(TEST_USER, message);
