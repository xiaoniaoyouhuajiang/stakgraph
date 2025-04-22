import { useEffect, useRef } from "https://esm.sh/preact/hooks";
import { html } from "./utils.js";

export const Messages = ({ messages }) => {
  const messagesEndRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return html`
    <div class="messages-container">
      ${messages.map(
        (message, index) => html`
          <div key=${index} class="message-wrapper ${message.role}">
            <div class="message-bubble ${message.role}">
              <pre class="message-content">${message.content}</pre>
            </div>
          </div>
        `
      )}
      <div ref=${messagesEndRef}></div>
    </div>
  `;
};
