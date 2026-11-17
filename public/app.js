
let currentMode = "medical";

const form = document.getElementById("chatForm");
const question = document.getElementById("question");
const messages = document.getElementById("messages");

function setMode(mode) {
  currentMode = mode;

  question.placeholder =
    mode === "medical"
      ? "Ask a medical question..."
      : "Ask a study question...";
}

function addMessage(role, text) {
  const div = document.createElement("div");

  div.className = `message ${role}`;
  div.textContent =
    (role === "user" ? "You: " : "MediMind AI: ") + text;

  messages.appendChild(div);
  div.scrollIntoView({ behavior: "smooth" });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = question.value.trim();

  if (!text) return;

  addMessage("user", text);
  question.value = "";

  const loading = document.createElement("div");
  loading.className = "message assistant";
  loading.textContent = "MediMind AI is thinking...";
  messages.appendChild(loading);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: currentMode,
        messages: [{ role: "user", content: text }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }

    loading.textContent = "MediMind AI: " + data.answer;

  } catch (error) {
    loading.textContent = "Error: " + error.message;
  }
});

