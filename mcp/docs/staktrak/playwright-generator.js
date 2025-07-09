/**
 * Generates a Playwright test from tracking data
 * @param {Object} trackingData - The tracking data object
 * @returns {string} - Generated Playwright test code
 */
export function generatePlaywrightTest(url, trackingData) {
  const { clicks, userInfo, time } = trackingData;

  if (!clicks || !clicks.clickDetails || clicks.clickDetails.length === 0) {
    return generateEmptyTest();
  }

  const testCode = `import { test, expect } from '@playwright/test';
  
  test('User interaction replay', async ({ page }) => {
    // Navigate to the page
    await page.goto('${url}');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Set viewport size to match recorded session
    await page.setViewportSize({ 
      width: ${userInfo.windowSize[0]}, 
      height: ${userInfo.windowSize[1]} 
    });
  
  ${generateClickActions(clicks.clickDetails)}

    await page.waitForTimeout(2500);
  });`;

  return testCode;
}

/**
 * Generates click actions from click details
 * @param {Array} clickDetails - Array of click detail arrays
 * @returns {string} - Generated click actions code
 */
function generateClickActions(clickDetails) {
  let actionsCode = "";
  let previousTimestamp = null;

  clickDetails.forEach((clickDetail, index) => {
    const [x, y, selector, timestamp] = clickDetail;

    // Calculate delay between clicks
    if (previousTimestamp !== null) {
      const delay = timestamp - previousTimestamp;
      if (delay > 100) {
        // Only add delay if it's significant
        actionsCode += `  
    // Wait ${delay}ms (matching user timing)
    await page.waitForTimeout(${delay});
  `;
      }
    }

    // Generate the click action
    const playwrightSelector = convertToPlaywrightSelector(selector);
    const comment = `Click ${index + 1}: ${playwrightSelector}`;

    actionsCode += `  
    // ${comment}
    const element${index + 1} = page.locator('${playwrightSelector}');
    await element${index + 1}.waitFor({ state: 'visible' });
    await element${index + 1}.click();
  `;

    previousTimestamp = timestamp;
  });

  return actionsCode;
}

/**
 * Converts CSS selector to Playwright-friendly selector
 * @param {string} cssSelector - CSS selector string
 * @returns {string} - Playwright selector
 */
export function convertToPlaywrightSelector(cssSelector) {
  // Handle data-testid attributes specially (Playwright best practice)
  if (cssSelector.includes('[data-testid="')) {
    const testIdMatch = cssSelector.match(/\[data-testid="([^"]+)"\]/);
    if (testIdMatch) {
      return `[data-testid="${testIdMatch[1]}"]`;
    }
  }

  // Clean up the selector for Playwright
  let selector = cssSelector;

  // Remove html>body> prefix as it's usually not needed
  selector = selector.replace(/^html>body>/, "");

  // Handle class combinations properly
  selector = selector.replace(/\.([^.#\[]+)/g, ".$1");

  // Handle ID selectors
  selector = selector.replace(/#([^.#\[]+)/g, "#$1");

  return selector;
}

/**
 * Generates an empty test template
 * @returns {string} - Empty test template
 */
function generateEmptyTest() {
  return `import { test, expect } from '@playwright/test';
  
  test('User interaction replay', async ({ page }) => {
    // Navigate to the page
    await page.goto('http://localhost:3000/frame.html');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // No clicks were recorded
    console.log('No user interactions to replay');
  });`;
}

/**
 * Generates coordinate-based click actions (fallback method)
 * @param {Array} clickDetails - Array of click detail arrays
 * @returns {string} - Generated coordinate-based click actions
 */
function generateCoordinateClickActions(clickDetails) {
  let actionsCode = "";

  clickDetails.forEach((clickDetail, index) => {
    const [x, y, selector, timestamp] = clickDetail;

    actionsCode += `
    // Click ${index + 1}: Click at coordinates (${x}, ${y})
    await page.mouse.click(${x}, ${y});
    await page.waitForTimeout(300); // Brief pause between clicks
  `;
  });

  return actionsCode;
}

// Browser compatibility (for non-module environments)
if (typeof window !== "undefined") {
  window.PlaywrightGenerator = {
    generatePlaywrightTest,
    convertToPlaywrightSelector,
  };
}
