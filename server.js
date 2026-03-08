import express from "express";
import cors from "cors";
import fetch from "node-fetch";

// Load environment variables from .env file
await import("dotenv/config");

const app = express();
const PORT = 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.post("/api/claude", async (req, res) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY not set in .env file." });
  }

  const { system, messages } = req.body;
  const userMessage = messages[0].content;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 4000,
        temperature: 1,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMessage }
        ]
      })
    });

    const data = await response.json();

    // Handle Groq API errors
    if (data.error) {
      console.error("Groq API error:", data.error);
      return res.status(500).json({ error: data.error.message });
    }

    // Extract text from Groq response
    const text = data.choices?.[0]?.message?.content || "";

    // Return in same format the frontend expects
    res.json({ content: [{ text }] });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Failed to reach Groq API." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT} (using Groq - Free)`);
});