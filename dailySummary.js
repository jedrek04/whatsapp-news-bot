import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
const PHONE_ID = process.env.PHONE_NUMBER_ID;
const TOKEN = process.env.WHATSAPP_TOKEN;

// Helper: clean array from Supabase
function normalizeArray(value) {
  if (!value) return [];
  let arr;
  if (Array.isArray(value)) arr = value;
  else {
    try {
      arr = JSON.parse(value);
      if (!Array.isArray(arr)) arr = [value];
    } catch {
      arr = [value];
    }
  }
  return arr.filter(item => item && item !== "[]").map(item => item.trim());
}

// Fetch top news articles for a user
async function fetchArticles(topics, sources) {
  let query = topics.length ? encodeURIComponent(topics.join(" OR ")) : "";
  let sourcesParam = sources.length ? sources.join(",") : "bbc-news,cnn"; // fallback

  try {
    const res = await axios.get(
      `https://newsapi.org/v2/top-headlines?q=${query}&sources=${sourcesParam}&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`
    );
    return res.data.articles || [];
  } catch (err) {
    console.error("❌ News API error:", err.response?.data || err.message);
    return [];
  }
}

// Summarize text with GPT
async function summarizeText(text) {
  try {
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful news summarizer for WhatsApp." },
        { role: "user", content: `Summarize this article in 2-3 sentences:\n\n${text}` }
      ]
    });
    return gptResponse.choices[0].message.content;
  } catch (err) {
    console.error("❌ GPT error:", err.message);
    return text;
  }
}

// Send WhatsApp message
async function sendWhatsApp(phone, message) {
  try {
    await axios.post(
      `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: message },
      },
      { headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Error sending message:", err.response?.data || err.message);
  }
}

// Main function
async function dailySummary() {
  console.log("📡 Fetching users...");
  const { data: users, error } = await supabase.from("users").select("*");
  if (error) return console.error("❌ Supabase fetch error:", error);
  console.log(`✅ Users fetched: ${users.length}`);

  for (const user of users) {
    const phone = user.phone_number;
    const topics = normalizeArray(user.topics);
    const sources = normalizeArray(user.sources);

    console.log(`User: ${phone}`);
    console.log(`Topics: ${topics.join(", ") || "(none)"}`);
    console.log(`Sources: ${sources.join(", ") || "(none)"}`);

    const articles = await fetchArticles(topics, sources);

    let message = `📰 Your Daily News Summary\n\nTopics: ${topics.join(", ") || "(none)"}\nSources: ${sources.join(", ") || "(default)"}\n\n`;

    if (articles.length === 0) {
      message += "No new articles found today.";
    } else {
      for (const article of articles) {
        const summary = await summarizeText(`${article.title}\n${article.description || ""}\n${article.content || ""}`);
        message += `• ${article.title} (${article.source.name})\n${summary}\n${article.url}\n\n`;
      }
    }

    await sendWhatsApp(phone, message);
    console.log(`✅ Message sent to ${phone}\n`);
  }

  console.log("✅ Daily summaries sent successfully!");
}

// Run
dailySummary();
