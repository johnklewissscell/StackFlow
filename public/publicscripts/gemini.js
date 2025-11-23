// -----------------------------
// gemini.js (OpenAI replacement)
// -----------------------------

// -----------------------------
// Configuration
// -----------------------------
const OPENAI_API_KEY = "YOUR_OPENAI_API_KEY"; // Replace with free trial key from https://platform.openai.com/

// -----------------------------
// DOM Elements
// -----------------------------
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const chatMessages = document.getElementById("chat-messages");
const chatStatus = document.getElementById("chat-status");

// -----------------------------
// Helper: Add message to chat
// -----------------------------
function addMessage(sender, text) {
  const msg = document.createElement("div");
  msg.style.marginBottom = "8px";
  msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// -----------------------------
// Call OpenAI API
// -----------------------------
async function runGemini(prompt) {
  try {
    chatStatus.textContent = "Gemini is typing...";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);

    const data = await response.json();
    const reply = data.choices[0].message.content;

    addMessage("Gemini", reply);
  } catch (err) {
    console.error("Error calling Gemini:", err);
    addMessage("Gemini", "Oops! Something went wrong.");
  } finally {
    chatStatus.textContent = "";
  }
}

// -----------------------------
// Optional: Enter key
// -----------------------------
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatSend.click();
  }
});
