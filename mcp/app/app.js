import { h, render } from "https://esm.sh/preact";
import { useState, useEffect } from "https://esm.sh/preact/hooks";
import { html } from "./utils.js";
import { Prompt } from "./prompt.js";
import { Messages } from "./messages.js";

let vscode;
if (window.acquireVsCodeApi) {
  vscode = window.acquireVsCodeApi();
  console.log("VSCode API is available");
} else {
  console.log("VSCode API is not available");
}

function postMessage(message) {
  if (vscode) {
    vscode.postMessage(message);
  } else {
    window.parent.postMessage(message, "*");
  }
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
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    postMessage({
      type: "request-base-url",
    });
    window.addEventListener("message", (event) => {
      if (event.data.type === "chat-res") {
        const message = event.data.message;
        setMessages((prevMessages) => {
          // Check if the last message is a loading message
          const lastMessage = prevMessages[prevMessages.length - 1];
          if (lastMessage && lastMessage.loading === true) {
            // Insert the new message before the loading message
            return [
              ...prevMessages.slice(0, prevMessages.length - 1),
              message,
              lastMessage,
            ];
          } else {
            // Otherwise just append the new message
            return [...prevMessages, message];
          }
        });
      } else if (event.data.type === "set-base-url") {
        console.log("=>> setBaseUrl", event.data.url);
        setBaseUrl(event.data.url);
      } else if (event.data.type === "done") {
        // Remove all messages with loading: true
        setMessages((prevMessages) =>
          prevMessages.filter((message) => !message.loading)
        );
      }
    });
  }, []);

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
    const userMessage = {
      role: "user",
      content: message.content,
      taggedWords: message.taggedWords,
    };
    const loadingMessage = {
      role: "assistant",
      content: "Loading...",
      loading: true,
    };
    console.log("=>> loadingMessage", loadingMessage);
    setMessages((prevMessages) => [
      ...prevMessages,
      userMessage,
      loadingMessage,
    ]);

    postMessage({
      type: "chat-msg",
      message: userMessage,
    });
  };

  return html`
    <div class="app-container">
      <${Messages} messages=${messages} />
      <${Prompt} onSend=${handleSend} baseUrl=${baseUrl} />
    </div>
  `;
};

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  render(h(App, null), document.getElementById("app"));
});
