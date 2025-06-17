import { Stagehand } from "@browserbasehq/stagehand";

export async function evaluate(
  browser_url: string,
  test_url: string,
  prompt: string
) {
  console.log("Creating Stagehand instance...");

  const stagehand = new Stagehand({
    env: "LOCAL",
    domSettleTimeoutMs: 30000,
    localBrowserLaunchOptions: {
      // docker default
      cdpUrl: browser_url || "http://chrome.sphinx:9222",
    },
    enableCaching: true,
    modelName: "gpt-4o",
    modelClientOptions: {
      apiKey: process.env.OPENAI_API_KEY,
    },
  });

  try {
    console.log("Initializing Stagehand...");
    await stagehand.init();
    console.log("Stagehand initialized successfully!");

    console.log("Navigating to page...");
    await stagehand.page.goto(test_url);
    console.log("Navigation successful!");

    await stagehand.close();
    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Direct Stagehand test failed:", error);
    console.error("Error stack:", error);
  }
}
