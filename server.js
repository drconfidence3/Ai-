
import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "40kb" }));
app.use(express.static("public"));

const limiter = rateLimit({
  windowMs: 60000,
  limit: 12
});

const medicalInstructions = `
You are MediMind AI, an educational medical assistant.

Explain health information in simple language.
Never claim to diagnose a patient.
Never prescribe medication or individualized doses.
Explain uncertainty.
Encourage professional medical care.
For emergencies, direct users to emergency services.
Protect personal health information.
`;

const studyInstructions = `
You are MediMind AI, an advanced study tutor.

Teach mathematics, biology, chemistry,
physics and other subjects.

Explain difficult concepts step by step.
Give examples and practice questions.
Help students understand their lessons.
`;

app.get("/api/status", (req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.OPENAI_API_KEY)
  });
});

app.post("/api/chat", limiter, async (req, res) => {
  try {
    const { mode, messages } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: "AI API key is not configured."
      });
    }

    if (!["medical", "study"].includes(mode)) {
      return res.status(400).json({
        error: "Invalid assistant mode."
      });
    }

    if (!Array.isArray(messages) ||
        messages.length < 1 ||
        messages.length > 12) {
      return res.status(400).json({
        error: "Invalid messages."
      });
    }

    const validMessages = messages.map(message => {
      if (
        !message ||
        !["user", "assistant"].includes(message.role) ||
        typeof message.content !== "string" ||
        !message.content.trim() ||
        message.content.length > 4000
      ) {
        throw new Error("Invalid message.");
      }

      return {
        role: message.role,
        content: message.content.trim()
      };
    });

    const instructions =
      mode === "medical"
        ? medicalInstructions
        : studyInstructions;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization":
            `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-5.5",
          instructions,
          input: validMessages,
          max_output_tokens: 1200
        }),
        signal: AbortSignal.timeout(60000)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(data.error);
      return res.status(502).json({
        error: "AI service request failed."
      });
    }

    const answer = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n");

    res.json({ answer });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Something went wrong."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `MediMind AI running at http://localhost:${PORT}`
  );
});
