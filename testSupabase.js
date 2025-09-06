import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Connect to Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const testConnection = async () => {
  try {
    // This will try to list all tables (or return empty if none)
    const { data, error } = await supabase.from("users").select("*");
    if (error) console.error("❌ Supabase error:", error);
    else console.log("✅ Supabase connection works:", data);
  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }
};

testConnection();