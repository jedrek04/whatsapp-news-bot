import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(bodyParser.json());

// ✅ OpenAI GPT setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

// ✅ WhatsApp & Supabase config
const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ✅ Helper to clean up arrays from Supabase
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

  // Remove invalid entries like "[]", empty strings, or whitespace-only strings
  return arr.filter(item => item && item !== "[]").map(item => item.trim());
}

// ✅ Webhook Verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ✅ Receive Messages, Store Users, Parse Commands, and Summarize with GPT
app.post("/webhook", async (req, res) => {
  const data = req.body;

  if (data.object) {
    const messages = data.entry?.[0]?.changes?.[0]?.value?.messages;

    if (messages && messages[0]) {
      const from = messages[0].from; // sender's WhatsApp number
      const text = messages[0].text?.body || "No text";

      console.log(`📩 New message from ${from}: ${text}`);

      // ✅ Check if user exists in Supabase
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("phone_number", from)
        .limit(1);

      if (fetchError) console.error("❌ Supabase fetch error:", fetchError);

      // ✅ If user does not exist, insert
      if (!existingUser || existingUser.length === 0) {
        const { data: newUser, error: insertError } = await supabase
          .from("users")
          .insert([{ phone_number: from }])
          .select();

        if (insertError) console.error("❌ Supabase insert error:", insertError);
        else console.log("✅ New user added:", newUser);
      }

      // ✅ COMMAND PARSING
      function parseCommand(text) {
        if (!text.startsWith("!")) return null;
        const [cmdPart, valuePart] = text.split(":").map(s => s.trim());
        const [command, action] = cmdPart.substring(1).split(" ").map(s => s.trim());
        const values = valuePart ? valuePart.split(",").map(v => v.trim()).filter(v => v) : [];
        return { command, action: action || "list", values };
      }

      const cmd = parseCommand(text);
      if (cmd) {
        const { command, action, values } = cmd;

        let column;
        if (command === "updatetime") column = "update_times";
        else if (command === "sources") column = "sources";
        else if (command === "topics") column = "topics";
        else column = null;

        if (column) {
          // Fetch current values from Supabase
          const { data: existingData } = await supabase
            .from("users")
            .select(column)
            .eq("phone_number", from)
            .single();

          let updatedArray = normalizeArray(existingData?.[column]);

          if (action === "add") updatedArray = [...new Set([...updatedArray, ...values])];
          else if (action === "remove") updatedArray = updatedArray.filter(v => !values.includes(v));
          else if (action === "reset") updatedArray = [];
          else if (action === "list") {
            await axios.post(
              `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`,
              {
                messaging_product: "whatsapp",
                to: from,
                type: "text",
                text: { body: `📋 Your current ${command}: ${updatedArray.join(", ") || "(none)"}` },
              },
              { headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" } }
            );
            return res.sendStatus(200);
          }

          // Save updated array
          const { error } = await supabase
            .from("users")
            .update({ [column]: updatedArray })
            .eq("phone_number", from);

          if (error) console.error(`❌ Error updating ${column}:`, error);

          // Reply to user
          await axios.post(
            `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`,
            {
              messaging_product: "whatsapp",
              to: from,
              type: "text",
              text: { body: `✅ Updated ${command}: ${updatedArray.join(", ") || "(none)"}` },
            },
            { headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" } }
          );

          return res.sendStatus(200);
        }
      }

      // ✅ GPT summarization (for messages that are NOT commands)
      if (!text.startsWith("!")) {
        let summary = text; // fallback
        try {
          const gptResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "You are a helpful news summarizer for WhatsApp." },
              { role: "user", content: `Summarize this message in 2-3 sentences: ${text}` }
            ]
          });
          summary = gptResponse.choices[0].message.content;
          console.log("📄 Summary:", summary);
        } catch (err) {
          console.error("❌ GPT error:", err.message);
        }

        // ✅ Send summary back to user via WhatsApp
        try {
          await axios.post(
            `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`,
            {
              messaging_product: "whatsapp",
              to: from,
              type: "text",
              text: { body: summary },
            },
            {
              headers: {
                Authorization: `Bearer ${TOKEN}`,
                "Content-Type": "application/json",
              },
            }
          );
        } catch (err) {
          console.error("❌ Error sending message:", err.response?.data || err.message);
        }
      }
    }
  }

  res.sendStatus(200);
});

// ✅ Start Server
app.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});
