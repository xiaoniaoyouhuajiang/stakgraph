<script>
  import axios from 'axios';
  import UAParser from 'ua-parser-js';

  let accessLogEntries = [];
  let errorLogEntries = [];
  let accessLogAnalysis = [];
  let errorLogAnalysis = [];
  let fileContent = ''; // To store file content for rescanning

  // Adjust this delay as needed
  const requestDelay = 1000; // 1 second delay

  async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function fetchIpData(ip) {
    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching IP data:', error);
      return { city: 'Unknown', country: 'Unknown' }; // Fallback data
    }
  }

  function parseLogEntry(entry) {
    // Match IP
    const ipMatch = entry.match(/^\d+\.\d+\.\d+\.\d+/);
    const ip = ipMatch ? ipMatch[0] : 'Unknown IP';

    // Match date and time
    const dateTimeMatch = entry.match(/\[(.*?)\]/);
    const dateTimeStr = dateTimeMatch ? dateTimeMatch[1] : 'Unknown Time';

    // Match user agent
    const userAgentMatch = entry.match(/"([^"]+)"$/);
    const userAgent = userAgentMatch ? userAgentMatch[1] : 'Unknown User Agent';

    // Match referer (optional)
    const refererMatch = entry.match(/"([^"]+)" "[^"]+"$/);
    const referer = refererMatch ? refererMatch[1] : 'None';

    return { ip, dateTimeStr, userAgent, referer };
  }


  function parseUserAgent(userAgent) {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    return {
      browser: `${result.browser.name} ${result.browser.version}`,
      os: `${result.os.name} ${result.os.version}`,
      device: result.device.model || 'Unknown'
    };
  }

  async function analyzeAccessLog(entry) {
    const { ip, dateTimeStr, userAgent, referer } = parseLogEntry(entry);

    await delay(requestDelay); // Throttle requests

    const ipData = await fetchIpData(ip);
    const userAgentData = parseUserAgent(userAgent);

    return {
      ip,
      dateTimeStr, // Displaying date string as-is
      location: `${ipData.city}, ${ipData.country}`,
      userAgent,
      referer,
      browser: userAgentData.browser,
      os: userAgentData.os,
      device: userAgentData.device,
      threatLevel: analyzeThreat(entry, userAgent)
    };
  }

  async function analyzeErrorLog(entry) {
    const { ip, dateTimeStr, userAgent, referer } = parseLogEntry(entry);

    let location = 'Unknown';
    let threatLevel = 'Low';

    if (ip) {
      await delay(requestDelay); // Throttle requests
      const ipData = await fetchIpData(ip);
      location = `${ipData.city}, ${ipData.country}`;
      threatLevel = 'Medium'; // Example threat level, could be more complex.
    }

    const userAgentData = parseUserAgent(userAgent);

    return {
      ip,
      dateTimeStr, // Displaying date string as-is
      location,
      userAgent,
      referer,
      browser: userAgentData.browser,
      os: userAgentData.os,
      device: userAgentData.device,
      threatLevel
    };
  }

  function analyzeThreat(entry, userAgent) {
    if (entry.includes('HEAD')) return 'Low';
    if (entry.includes('client denied')) return 'Medium';
    if (!userAgent.includes('Mozilla') && !userAgent.includes('Safari')) return 'Suspicious'; // Example check
    return 'Unknown';
  }

  async function processLogs() {
    accessLogAnalysis = await Promise.all(accessLogEntries.map(analyzeAccessLog));
    errorLogAnalysis = await Promise.all(errorLogEntries.map(analyzeErrorLog));
  }

  function handleFileUpload(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      fileContent = reader.result;
      const lines = fileContent.split('\n').filter(line => line.trim());
      accessLogEntries = lines.filter(line => line.includes('HEAD') || line.includes('GET'));
      errorLogEntries = lines.filter(line => line.includes('client denied'));
      await processLogs();
    };
    reader.readAsText(file);
  }

  function handleRescan() {
    if (fileContent) {
      const lines = fileContent.split('\n').filter(line => line.trim());
      accessLogEntries = lines.filter(line => line.includes('HEAD') || line.includes('GET'));
      errorLogEntries = lines.filter(line => line.includes('client denied'));
      processLogs();
    }
  }
</script>


<input type="file" accept=".txt" on:change={handleFileUpload} />
<button on:click={handleRescan} disabled={!fileContent}>Rescan</button>

{#if accessLogAnalysis.length > 0 || errorLogAnalysis.length > 0}
  <h3>Access Log Analysis</h3>
  {#each accessLogAnalysis as analysis}
    <div class="log-entry">
      <p><strong>IP:</strong> {analysis.ip}</p>
      <p><strong>Time:</strong> {analysis.dateTimeStr}</p> <!-- Displaying date string as-is -->
      <p><strong>Location:</strong> {analysis.location}</p>
      <p><strong>Referer:</strong> {analysis.referer}</p>
      <p><strong>Browser:</strong> {analysis.browser}</p>
      <p><strong>OS:</strong> {analysis.os} <strong>Device:</strong> {analysis.device}</p>
      <p><strong>Threat Level:</strong> {analysis.threatLevel}</p>
    </div>
  {/each}

  <h3>Error Log Analysis</h3>
  {#each errorLogAnalysis as analysis}
    <div class="log-entry">
      <p><strong>IP:</strong> {analysis.ip}</p>
      <p><strong>Time:</strong> {analysis.dateTimeStr}</p> <!-- Displaying date string as-is -->
      <p><strong>Location:</strong> {analysis.location}</p>
      <p><strong>Referer:</strong> {analysis.referer}</p>
      <p><strong>Browser:</strong> {analysis.browser}</p>
      <p><strong>OS:</strong> {analysis.os}</p>
      <p><strong>Device:</strong> {analysis.device}</p>
      <p><strong>Threat Level:</strong> {analysis.threatLevel}</p>
    </div>
  {/each}
{/if}

<style>
  input[type="file"] {
    margin: 1rem 0;
  }
  button {
    margin: 1rem 0;
    padding: 0.5rem 1rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
  .log-entry {
    padding: 1rem;
    background-color: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .log-entry p {
    margin: 0.5rem 0;
  }
  .log-entry strong {
    color: #333;
  }
</style>
