import { h, render } from "https://esm.sh/preact";
import { useState } from "https://esm.sh/preact/hooks";
import { html, getRepoNameFromUrl, LoadingSvg } from "./utils.js";

const App = () => {
  const [repoUrl, setRepoUrl] = useState("");
  const [username, setUsername] = useState("");
  const [pat, setPat] = useState("");

  const [currentRepoName, setCurrentRepoName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRepoUrlChange = (event) => {
    setRepoUrl(event.target.value);
  };
  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
  };
  const handlePatChange = (event) => {
    setPat(event.target.value);
  };

  const handleSubmit = async () => {
    setCurrentRepoName(getRepoNameFromUrl(repoUrl));
    setIsLoading(true);
    await fetch("/ingest", {
      method: "POST",
      body: JSON.stringify({ repo_url: repoUrl, username, pat }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    setIsLoading(false);
  };
  return html`
    <div class="app-container">
      <div class="app-header">
        <h1>Stakgraph${currentRepoName ? `: ${currentRepoName}` : ""}</h1>
      </div>
      <div class="app-body">
        <input
          type="text"
          placeholder="Repo URL"
          value=${repoUrl}
          onInput=${handleRepoUrlChange}
        />
        <input
          type="text"
          placeholder="Username (optional)"
          value=${username}
          onInput=${handleUsernameChange}
        />
        <input
          type="text"
          placeholder="PAT (optional)"
          value=${pat}
          onInput=${handlePatChange}
        />
        <button onClick=${handleSubmit} disabled=${!repoUrl || isLoading}>
          ${isLoading
            ? html`<div class="loading"><${LoadingSvg} /></div>`
            : "Submit"}
        </button>
      </div>
    </div>
  `;
};

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  render(h(App, null), document.getElementById("app"));
});
