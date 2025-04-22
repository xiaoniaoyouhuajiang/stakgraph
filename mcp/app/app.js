import { h, render } from "https://esm.sh/preact";
import { useState, useEffect } from "https://esm.sh/preact/hooks";
import { html } from "./utils.js";
import { Prompt } from "./prompt.js";
import { Messages } from "./messages.js";

if (window.acquireVsCodeApi) {
  const vscode = window.acquireVsCodeApi();
  console.log("VSCode API is available");
} else {
  console.log("VSCode API is not available");
}

const App = () => {
  const [darkMode, setDarkMode] = useState(
    window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! How can I help you today?",
    },
  ]);

  // Check for dark mode
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );
    const handleChange = (e) => setDarkMode(e.matches);

    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }

    darkModeMediaQuery.addEventListener("change", handleChange);
    return () => darkModeMediaQuery.removeEventListener("change", handleChange);
  }, [darkMode]);

  const handleSend = (message) => {
    console.log("Message sent:", message);

    // Log the message text and tagged words
    console.log("Message text:", message.text);
    console.log("Tagged words:", message.taggedWords);

    // Add user message
    const userMessage = {
      role: "user",
      content: message.text,
      taggedWords: message.taggedWords,
    };

    // Example assistant response
    const assistantResponse = {
      role: "assistant",
      content: `I received your message about "${message.text}". Thank you for sharing that with me.`,
    };

    // Update messages state with both messages
    setMessages((prevMessages) => [
      ...prevMessages,
      userMessage,
      assistantResponse,
    ]);
  };

  return html`
    <div class="app-container">
      <${Messages} messages=${messages} />
      <${Prompt} onSend=${handleSend} />
    </div>
  `;
};

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  render(h(App, null), document.getElementById("app"));
});
