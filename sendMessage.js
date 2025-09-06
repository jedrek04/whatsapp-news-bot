import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.PHONE_NUMBER_ID;
const TO = "48532771329"; // my no so far

const sendMessage = async () => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: TO,
        type: "text",
        text: { body: "Hi!\nIm you new news bot" },
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Message sent successfully:", response.data);
  } catch (error) {
    console.error("❌ Failed to send message:", error.response?.data || error.message);
  }
};

sendMessage();
