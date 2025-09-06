import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const NEWS_API_KEY = process.env.NEWSAPI_KEY;
const TOPIC = "bitcoin"; // we’ll later make this user-configurable

async function fetchNews() {
  try {
    const response = await axios.get(
      `https://newsapi.org/v2/everything?q=${TOPIC}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${NEWS_API_KEY}`
    );
    const articles = response.data.articles;
    console.log("📰 Latest articles for topic:", TOPIC);
    articles.forEach((a, i) => {
      console.log(`${i + 1}. ${a.title} (${a.source.name})`);
      console.log(`   ${a.url}`);
    });
  } catch (err) {
    console.error("❌ Error fetching news:", err.response?.data || err.message);
  }
}

fetchNews();