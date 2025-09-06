import axios from "axios";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const NEWS_API_KEY = process.env.NEWSAPI_KEY;
const OPENAI_KEY = process.env.OPENAI_KEY;

const openai = new OpenAI({ apiKey: OPENAI_KEY });
const TOPIC = "bitcoin"; // hardcoded for now

async function fetchNews() {
  try {
    const response = await axios.get(
      `https://newsapi.org/v2/everything?q=${TOPIC}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${NEWS_API_KEY}`
    );
    return response.data.articles;
  } catch (err) {
    console.error("❌ Error fetching news:", err.response?.data || err.message);
    return [];
  }
}

async function summarizeArticle(article) {
  try {
    const prompt = `
      Summarize the following news article in 2-3 sentences. 
      Include the main idea and keep it objective.
      Title: ${article.title}
      Description: ${article.description || "No description provided"}
      Source: ${article.source.name}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error("❌ Error summarizing article:", err.response?.data || err.message);
    return null;
  }
}

async function main() {
  const articles = await fetchNews();
  console.log(`📰 Summarizing ${articles.length} articles for topic: ${TOPIC}\n`);

  for (const article of articles) {
    const summary = await summarizeArticle(article);
    console.log(`Title: ${article.title}`);
    console.log(`Summary: ${summary}`);
    console.log(`URL: ${article.url}\n`);
  }
}

main();
