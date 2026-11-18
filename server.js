
/*
  MEDIMIND AI
  Backend server
  AI Provider: Groq
  Model: OpenAI GPT-OSS 120B
*/

require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Groq = require("groq-sdk");

// ------------------------------------
// APP CONFIGURATION
// ------------------------------------

const app = express();

const PORT = process.env.PORT || 3000;

const MODEL = "openai/gpt-oss-120b";

// ------------------------------------
// GROQ CONFIGURATION
// ------------------------------------

if (!process.env.GROQ_API_KEY) {
  console.error("ERROR: GROQ_API_KEY is missing from .env");
  process.exit(1);
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// ------------------------------------
// SECURITY MIDDLEWARE
// ------------------------------------

app.use(helmet());

app.use(express.json({
  limit: "1mb"
}));

app.use(express.static("public"));

app.use("/api/", rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again shortly."
  }
}));

// ------------------------------------
// MEDIMIND AI SYSTEM PROMPTS
// ------------------------------------

const prompts = {

  medical: `
You are MediMind AI, an advanced medical education assistant.

Your responsibilities:

1. Explain medical and health science topics.
2. Explain diseases, anatomy, physiology and medical terminology for educational purposes.
3. Help users understand general medical information.
4. Explain medical research in simple language.
5. Help users prepare questions for qualified healthcare professionals.
6. Be accurate, clear, respectful and responsible.

IMPORTANT SAFETY RULES:

- You are an educational AI, not a doctor.
- Do not diagnose users.
- Do not prescribe medication or recommend personal treatment plans.
- Do not claim certainty when information is uncertain.
- Encourage users to speak with qualified healthcare professionals about personal medical concerns.
- For possible emergencies, advise contacting local emergency services or visiting the nearest emergency department.
- Do not request unnecessary personal or identifying medical information.
- Protect user privacy.

Always make your explanations easy to understand.
`,

  study: `
You are MediMind AI Study Assistant.

Your job is to help students learn medical and science subjects.

You can:

1. Explain difficult topics step by step.
2. Explain anatomy and physiology.
3. Explain biology, chemistry and medicine.
4. Create educational summaries.
5. Help students understand scientific concepts.
6. Give examples and analogies.
7. Help with revision and learning.
8. Explain answers clearly.

Use simple language when appropriate.
Be encouraging, accurate and educational.
`
};

// ------------------------------------
// HOME ROUTE
// ------------------------------------

app.get("/", (req, res) => {
  res.sendFile(
    require("path").join(__dirname, "public", "index.html")
  );
});

// ------------------------------------
// API STATUS ROUTE
// ------------------------------------

app.get("/api/status", (req, res) => {

  res.json({
    success: true,
    app: "MediMind AI",
    status: "online",
    provider: "Groq",
    model: MODEL
  });

});

// ------------------------------------
// CHAT API
// ------------------------------------

app.post("/api/chat", async (req, res) => {

  try {

    const {
      mode = "medical",
      messages
    } = req.body || {};

    // Validate mode

    if (!["medical", "study"].includes(mode)) {

      return res.status(400).json({
        success: false,
        error: "Invalid chat mode."
      });

    }

    // Validate messages

    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > 30
    ) {

      return res.status(400).json({
        success: false,
        error: "Please provide a valid conversation."
      });

    }

    // Validate each message

    for (const message of messages) {

      if (
        !message ||
        !["user", "assistant"].includes(message.role) ||
        typeof message.content !== "string" ||
        message.content.trim().length === 0 ||
        message.content.length > 10000
      ) {

        return res.status(400).json({
          success: false,
          error: "Invalid message format."
        });

      }

    }

    // Keep the API input within a reasonable limit

    const conversation = messages.map(message => ({
      role: message.role,
      content: message.content
    }));

    // Send request to Groq

    const completion =
      await groq.chat.completions.create({

        model: MODEL,

        messages: [
          {
            role: "system",
            content: prompts[mode]
          },
          ...conversation
        ],

        temperature: 0.5,

        max_completion_tokens: 1200

      });

    // Get AI response

    const answer =
      completion.choices?.[0]?.message?.content ||
      "Sorry, I couldn't generate a response. Please try again.";

    // Return response to frontend

    return res.json({

      success: true,
      model: MODEL,
      answer

    });

  } catch (error) {

    console.error(
      "MediMind AI Error:",
      error.message
    );

    return res.status(500).json({

      success: false,
      error: "MediMind AI is temporarily unavailable. Please try again."

    });

  }

});

// ------------------------------------
// 404 API HANDLER
// ------------------------------------

app.use("/api", (req, res) => {

  res.status(404).json({

    success: false,
    error: "API endpoint not found."

  });

});

// ------------------------------------
// GENERAL ERROR HANDLER
// ------------------------------------

app.use((err, req, res, next) => {

  console.error("Server error:", err.message);

  res.status(500).json({

    success: false,
    error: "An unexpected server error occurred."

  });

});

// ------------------------------------
// START SERVER
// ------------------------------------

app.listen(PORT, () => {

  console.log("--------------------------------");
  console.log("       MEDIMIND AI SERVER       ");
  console.log("--------------------------------");

  console.log("Status: ONLINE");
  console.log("Provider: GROQ");
  console.log("Model:", MODEL);

  console.log(
    `Website: http://localhost:${PORT}`
  );

  console.log("--------------------------------");

});
