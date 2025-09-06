import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY
});

async function summarizeNews() {
  const article = `
  The US stock market saw significant volatility today as tech stocks fell sharply.
  Investors are concerned about inflation and interest rates. Analysts predict
  continued uncertainty in the coming weeks.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful news summarizer." },
      { role: "user", content: `Summarize this article in 3-5 sentences: ${article}` }
    ]
  });

  console.log("📄 Summary:", response.choices[0].message.content);
}

summarizeNews();
