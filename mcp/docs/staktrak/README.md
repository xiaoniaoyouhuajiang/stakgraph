# StakTrak: User Interaction Recording

StakTrak is a lightweight utility for recording and replaying user interactions with web pages. It captures various types of user inputs and generates Playwright tests that can reproduce those interactions.

## Features

- **Click recording**: Tracks all user clicks with element selectors
- **Keyboard input recording**: Captures keyboard activity, especially in input fields
- **Test generation**: Automatically generates Playwright tests from recorded interactions
- **Timing preservation**: Maintains realistic timing between user actions

## Recorded Interactions

StakTrak records the following user interactions:

- **Mouse clicks**: Element clicked, position, and timestamp
- **Keyboard input**: Keys pressed, associated input elements, and values
- **Form interactions**: Form submissions
- **Navigation**: Page navigation events
- **Scrolling**: Scroll positions and timing
- **Window resizing**: Changes to window dimensions

## Using Input Recording

The latest version now includes enhanced support for recording input field interactions:

1. All keypress events in input fields are tracked with their associated elements
2. The final value of input fields is recorded
3. Generated tests use appropriate Playwright commands like `fill()` to reproduce input

## Running the Demo

1. Start the server: `npx serve`
2. Open the demo page: `http://localhost:3000`
3. Click "Start Recording"
4. Interact with buttons and type in the input field
5. Click "Stop Recording"
6. Click "Generate Playwright Test"
7. Copy the generated test code

## Example Test

The generator will produce code like:

```javascript
test("User interaction replay", async ({ page }) => {
  // Navigate to the page
  await page.goto("http://localhost:3000/frame.html");

  // Wait for page to load
  await page.waitForLoadState("networkidle");

  // Click on a button
  const element1 = page.locator('[data-testid="staktrak-div"]');
  await element1.waitFor({ state: "visible" });
  await element1.click();

  // Wait 547ms (matching user timing)
  await page.waitForTimeout(547);

  // Type into input field
  const inputElement2 = page.locator('[data-testid="test-input"]');
  await inputElement2.waitFor({ state: "visible" });
  await inputElement2.click();
  await inputElement2.fill("Hello, world!");
});
```
