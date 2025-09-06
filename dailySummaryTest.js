import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function fetchUsers() {
  const { data: users, error } = await supabase
    .from("users")
    .select("*");

  if (error) {
    console.error("❌ Error fetching users:", error);
    return;
  }

  console.log("✅ Users fetched:", users.length);
  users.forEach(user => {
    // Ensure columns are arrays
    const topics = Array.isArray(user.topics) ? user.topics : (user.topics ? [user.topics] : []);
    const sources = Array.isArray(user.sources) ? user.sources : (user.sources ? [user.sources] : []);
    const updateTimes = Array.isArray(user.update_times) ? user.update_times : (user.update_times ? [user.update_times] : []);

    console.log(`\nUser ID: ${user.id}`);
    console.log(`Phone: ${user.phone_number}`);
    console.log(`Topics: ${topics.join(", ") || "None"}`);
    console.log(`Sources: ${sources.join(", ") || "None"}`);
    console.log(`Update Times: ${updateTimes.join(", ") || "None"}`);
    });

}

// Run the function
fetchUsers();
