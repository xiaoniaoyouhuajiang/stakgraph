import htm from "https://esm.sh/htm";
import { h } from "https://esm.sh/preact";
import { useEffect, useRef } from "https://esm.sh/preact/hooks";

export const html = htm.bind(h);

export function getRepoNameFromUrl(url) {
  // Extract organization/repo format: stakwork/sphinx-tribes-frontend
  const matches = url.match(/github\.com\/([^\/]+\/[^\/\.]+)(\.git)?$/);
  if (matches && matches[1]) {
    return matches[1];
  }

  // As a fallback, extract just the repo name
  const repoName = url.split("/").pop()?.replace(".git", "") || "";
  return repoName;
}

export const LoadingSvg = () => html`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150">
    <path
      fill="none"
      stroke="#878787"
      stroke-width="15"
      stroke-linecap="round"
      stroke-dasharray="300 385"
      stroke-dashoffset="0"
      d="M275 75c0 31-27 50-50 50-58 0-92-100-150-100-28 0-50 22-50 50s23 50 50 50c58 0 92-100 150-100 24 0 50 19 50 50Z"
    >
      <animate
        attributeName="stroke-dashoffset"
        calcMode="spline"
        dur="2"
        values="685;-685"
        keySplines="0 0 1 1"
        repeatCount="indefinite"
      ></animate>
    </path>
  </svg>
`;

const fetchHeaders = {
  "Content-Type": "application/json",
};

export const GET = async (url) =>
  await fetch(url, {
    method: "GET",
    headers: fetchHeaders,
  });

export const POST = async (url, body) =>
  await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: fetchHeaders,
  });

export const useSSE = (url, options = {}) => {
  const eventSourceRef = useRef(null);

  const {
    onMessage,
    onError,
    onOpen,
    onClose,
    autoReconnect = true,
    customEvents = [],
  } = options;

  useEffect(() => {
    // Create EventSource connection
    eventSourceRef.current = new EventSource(url);
    const eventSource = eventSourceRef.current;

    // Handle incoming messages
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data, event);
      } catch (error) {
        onMessage?.(event.data, event);
      }
    };

    // Handle connection open
    eventSource.onopen = (event) => {
      console.log("SSE Connection opened");
      onOpen?.(event);
    };

    // Handle errors
    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
      onError?.(error);
    };

    // Handle custom event types
    customEvents.forEach((eventType) => {
      eventSource.addEventListener(eventType, (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(`SSE Custom Event (${eventType}):`, data);
        } catch (error) {
          console.log(`SSE Custom Event (${eventType}):`, event.data);
        }
      });
    });

    // Cleanup function
    return () => {
      console.log("Closing SSE connection");
      onClose?.();
      eventSource.close();
    };
  }, [url]);

  // Method to manually close connection
  const closeConnection = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
  };

  return { closeConnection };
};

export default useSSE;
