interface Clicks {
  clickDetails: [number, number, string, number][];
}

interface InputChange {
  elementSelector: string;
  value: string;
  timestamp: number;
  action?: string;
}

interface FormElementChange {
  elementSelector: string;
  type: "checkbox" | "radio" | "select";
  value: string;
  checked?: boolean;
  text?: string;
  timestamp: number;
}

interface Assertion {
  type: "isVisible" | "hasText" | "isChecked" | "isNotChecked";
  selector: string;
  value: string;
  timestamp: number;
}

interface UserInfo {
  windowSize: [number, number];
}

interface TrackingData {
  clicks?: Clicks;
  keyboardActivities?: any;
  inputChanges?: InputChange[];
  focusChanges?: any;
  assertions?: Assertion[];
  userInfo: UserInfo;
  time?: any;
  formElementChanges?: FormElementChange[];
}

interface Event {
  type: "click" | "input" | "form" | "assertion";
  selector?: string;
  timestamp: number;
  isUserAction: boolean;
  x?: number;
  y?: number;
  value?: string;
  formType?: string;
  checked?: boolean;
  text?: string;
  assertionType?: string;
}

function convertToPlaywrightSelector(cssSelector: string): string {
  if (!cssSelector) return "";

  let selector = cssSelector;

  // Handle data-testid attributes first (highest priority)
  if (selector.includes("[data-testid=")) {
    const match = selector.match(/\[data-testid="([^"]+)"\]/);
    if (match) return `[data-testid="${match[1]}"]`;
  }

  // Handle ID selectors (high priority)
  const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
  if (idMatch) return `#${idMatch[1]}`;

  // If it's a very long complex selector from html>body, extract the target element
  if (selector.includes('html') && selector.includes('body') && selector.length > 100) {
    const parts = selector.split('>').map(part => part.trim());
    
    // Find the last interactive element
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (part.includes('button') || 
          (part.includes('a') && part.includes('.')) || 
          part.includes('input') || 
          part.includes('select') || 
          part.includes('textarea')) {
        selector = part;
        break;
      }
    }
  }

  // Now clean up the selector more aggressively
  // Split by classes and clean each one
  const parts = selector.split('.');
  const tagName = parts[0]; // button, a, div, etc.
  const classes = parts.slice(1);

  // Clean each class name
  const cleanClasses = classes
    .map(className => {
      if (!className) return '';
      
      // Remove problematic Tailwind patterns
      className = className.replace(/disabled:[\w-]+/g, ''); // disabled:pointer-events-none
      className = className.replace(/hover:[\w-\/]+/g, ''); // hover:bg-primary/90
      className = className.replace(/focus-visible:[\w-\[\]\/]+/g, ''); // focus-visible:ring-[3px]
      className = className.replace(/aria-invalid:[\w-\/]+/g, ''); // aria-invalid:ring-destructive/20
      className = className.replace(/dark:[\w-\/]+/g, ''); // dark:aria-invalid
      className = className.replace(/\[&[^\]]*\]/g, ''); // [&_svg] patterns
      className = className.replace(/has-\[[^\]]*\]/g, ''); // has-[>svg]
      
      // Clean up any remaining brackets, colons, and special characters
      className = className.replace(/[\[\]:&]/g, '');
      className = className.replace(/\([^)]*\)/g, ''); // Remove parentheses content
      className = className.replace(/[^\w-]/g, ''); // Keep only word chars and hyphens
      
      return className;
    })
    .filter(className => className && className.length > 0); // Remove empty classes

  // Rebuild selector with cleaned classes
  let cleanSelector = tagName;
  if (cleanClasses.length > 0) {
    // Limit to most important classes to avoid overly long selectors
    const importantClasses = cleanClasses.slice(0, 8);
    cleanSelector += '.' + importantClasses.join('.');
  }

  // Remove any trailing dots or cleanup artifacts
  cleanSelector = cleanSelector.replace(/\.+$/, '');
  cleanSelector = cleanSelector.replace(/\.{2,}/g, '.');

  // Validate and use CSS.escape as fallback for individual problematic classes
  if (!isValidCSSSelector(cleanSelector)) {
    console.warn(`Selector still invalid: ${cleanSelector}, trying CSS.escape approach`);
    
    // Try escaping individual class names that might have special characters
    const escapedParts = cleanSelector.split('.');
    const escapedTagName = escapedParts[0];
    const escapedClasses = escapedParts.slice(1).map(className => {
      try {
        // Test if this class name needs escaping
        document.querySelector(`.${className}`);
        return className;
      } catch (e) {
        // If it fails, try to escape it
        if (typeof CSS !== 'undefined' && CSS.escape) {
          return CSS.escape(className);
        } else {
          console.warn(`CSS.escape not supported, falling back to manual escaping for: ${className}`);
        }
        // Fallback: remove problematic characters
        return className.replace(/[^\w-]/g, '');
      }
    }).filter(Boolean);

    cleanSelector = escapedTagName;
    if (escapedClasses.length > 0) {
      cleanSelector += '.' + escapedClasses.join('.');
    }
  }

  return cleanSelector || tagName || 'body *';
}

function isValidCSSSelector(selector: string): boolean {
  if (!selector || selector.trim() === '') return false;
  
  try {
    if (typeof document !== 'undefined') {
      document.querySelector(selector);
    }
    return true;
  } catch (e) {
    return false;
  }
}

function generatePlaywrightTest(
  url: string,
  trackingData?: TrackingData
): string {
  if (!trackingData) return generateEmptyTest(url);

  const { clicks, inputChanges, assertions, userInfo, formElementChanges } =
    trackingData;

  if (
    !clicks?.clickDetails?.length &&
    !inputChanges?.length &&
    !assertions?.length &&
    !formElementChanges?.length
  ) {
    return generateEmptyTest(url);
  }

  return `import { test, expect } from '@playwright/test';
    
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
  
  ${generateUserInteractions(
    clicks,
    inputChanges,
    trackingData.focusChanges,
    assertions,
    formElementChanges
  )}
  
    await page.waitForTimeout(432);
  });`;
}

function generateEmptyTest(url: string): string {
  return `import { test, expect } from '@playwright/test';
  
  test('Empty test template', async ({ page }) => {
    // Navigate to the page
    await page.goto('${url}');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // No interactions were recorded
    console.log('No user interactions to replay');
  });`;
}

function generateUserInteractions(
  clicks?: Clicks,
  inputChanges?: InputChange[],
  focusChanges?: any,
  assertions: Assertion[] = [],
  formElementChanges: FormElementChange[] = []
): string {
  const allEvents: Event[] = [];
  const processedSelectors = new Set<string>();
  const formElementTimestamps: Record<string, number> = {};

  if (formElementChanges?.length) {
    const formElementsBySelector: Record<string, FormElementChange[]> = {};

    formElementChanges.forEach((change) => {
      const selector = change.elementSelector;
      if (!formElementsBySelector[selector])
        formElementsBySelector[selector] = [];
      formElementsBySelector[selector].push(change);
    });

    Object.entries(formElementsBySelector).forEach(([selector, changes]) => {
      changes.sort((a, b) => a.timestamp - b.timestamp);

      if (changes[0].type === "checkbox" || changes[0].type === "radio") {
        const latestChange = changes[changes.length - 1];
        allEvents.push({
          type: "form",
          formType: latestChange.type,
          selector: latestChange.elementSelector,
          value: latestChange.value,
          checked: latestChange.checked,
          timestamp: latestChange.timestamp,
          isUserAction: true,
        });
        formElementTimestamps[selector] = latestChange.timestamp;
      } else if (changes[0].type === "select") {
        let lastValue: string | null = null;
        changes.forEach((change) => {
          if (change.value !== lastValue) {
            allEvents.push({
              type: "form",
              formType: change.type,
              selector: change.elementSelector,
              value: change.value,
              text: change.text,
              timestamp: change.timestamp,
              isUserAction: true,
            });
            formElementTimestamps[selector] = change.timestamp;
            lastValue = change.value;
          }
        });
      }

      processedSelectors.add(selector);
    });
  }

  if (clicks?.clickDetails?.length) {
    clicks.clickDetails.forEach((clickDetail) => {
      const [x, y, originalSelector, timestamp] = clickDetail;
      
      // Convert selector early to catch issues
      const convertedSelector = convertToPlaywrightSelector(originalSelector);
      
      // Skip if conversion failed or resulted in empty selector
      if (!convertedSelector || convertedSelector.trim() === '') {
        console.warn(`Skipping click with invalid selector: ${originalSelector}`);
        return;
      }

      const shouldSkip =
        processedSelectors.has(originalSelector) ||
        processedSelectors.has(convertedSelector) ||
        Object.entries(formElementTimestamps).some(
          ([formSelector, formTimestamp]) => {
            return (
              (originalSelector.includes(formSelector) ||
                formSelector.includes(originalSelector) ||
                convertedSelector.includes(formSelector)) &&
              Math.abs(timestamp - formTimestamp) < 500
            );
          }
        );

      if (!shouldSkip) {
        allEvents.push({
          type: "click",
          x,
          y,
          selector: convertedSelector, // Use converted selector
          timestamp,
          isUserAction: true,
        });
      }
    });
  }

  if (inputChanges?.length) {
    const completedInputs = inputChanges.filter(
      (change) => change.action === "complete" || !change.action
    );

    completedInputs.forEach((change) => {
      if (
        !processedSelectors.has(change.elementSelector) &&
        !change.elementSelector.includes('type="checkbox"') &&
        !change.elementSelector.includes('type="radio"')
      ) {
        allEvents.push({
          type: "input",
          selector: change.elementSelector,
          value: change.value,
          timestamp: change.timestamp,
          isUserAction: true,
        });
      }
    });
  }

  if (assertions?.length) {
    assertions.forEach((assertion) => {
      const text = assertion.value || "";
      const isShortText = text.length < 4;

      if (!isShortText && text.trim().length > 0) {
        allEvents.push({
          type: "assertion",
          assertionType: assertion.type,
          selector: assertion.selector,
          value: assertion.value,
          timestamp: assertion.timestamp,
          isUserAction: false,
        });
      }
    });
  }

  allEvents.sort((a, b) => a.timestamp - b.timestamp);

  const uniqueEvents: Event[] = [];
  const processedFormActions = new Set<string>();

  allEvents.forEach((event) => {
    if (event.type === "form") {
      const eventKey = `${event.formType}-${event.selector}-${
        event.checked !== undefined ? event.checked : event.value
      }`;
      if (!processedFormActions.has(eventKey)) {
        uniqueEvents.push(event);
        processedFormActions.add(eventKey);
      }
    } else {
      uniqueEvents.push(event);
    }
  });

  let code = "";
  let lastUserActionTimestamp: number | null = null;

  uniqueEvents.forEach((event, index) => {
    if (index > 0) {
      const prevEvent = uniqueEvents[index - 1];

      if (event.isUserAction) {
        let waitTime = 0;

        if (lastUserActionTimestamp) {
          waitTime = event.timestamp - lastUserActionTimestamp;
        } else if (prevEvent.isUserAction) {
          waitTime = event.timestamp - prevEvent.timestamp;
        }

        waitTime = Math.max(100, Math.min(5000, waitTime));

        if (waitTime > 100) {
          code += `  await page.waitForTimeout(${waitTime});\n\n`;
        }
      }
    }

    switch (event.type) {
      case "click":
        const playwrightSelector = convertToPlaywrightSelector(event.selector!);
        code += `  // Click on element: ${event.selector}\n`;
        code += `  await page.click('${playwrightSelector}');\n\n`;
        lastUserActionTimestamp = event.timestamp;
        break;

      case "input":
        const inputSelector = convertToPlaywrightSelector(event.selector!);
        const escapedInputValue = escapeTextForAssertion(event.value!);
        code += `  // Fill input: ${event.selector}\n`;
        code += `  await page.fill('${inputSelector}', '${escapedInputValue}');\n\n`;
        lastUserActionTimestamp = event.timestamp;
        break;

      case "form":
        const formSelector = convertToPlaywrightSelector(event.selector!);

        if (event.formType === "checkbox" || event.formType === "radio") {
          if (event.checked) {
            code += `  // Check ${event.formType}: ${event.selector}\n`;
            code += `  await page.check('${formSelector}');\n\n`;
          } else {
            code += `  // Uncheck ${event.formType}: ${event.selector}\n`;
            code += `  await page.uncheck('${formSelector}');\n\n`;
          }
        } else if (event.formType === "select") {
          const escapedSelectValue = escapeTextForAssertion(event.value!);
          code += `  // Select option: ${event.text || event.value} in ${
            event.selector
          }\n`;
          code += `  await page.selectOption('${formSelector}', '${escapedSelectValue}');\n\n`;
        }
        lastUserActionTimestamp = event.timestamp;
        break;

      case "assertion":
        const assertionSelector = convertToPlaywrightSelector(event.selector!);
        switch (event.assertionType) {
          case "isVisible":
            code += `  // Assert element is visible: ${event.selector}\n`;
            code += `  await expect(page.locator('${assertionSelector}')).toBeVisible();\n\n`;
            break;
          case "hasText":
            const genericSelectors = [
              "div",
              "p",
              "span",
              "h1",
              "h2",
              "h3",
              "h4",
              "h5",
              "h6",
            ];
            const isGenericSelector = genericSelectors.includes(
              event.selector!
            );

            if (isGenericSelector) {
              const cleanedText = cleanTextForGetByText(event.value!);
              const isShortText =
                cleanedText.length < 10 || cleanedText.split(" ").length <= 2;

              code += `  // Assert element contains text: ${event.selector}\n`;
              if (isShortText) {
                code += `  await expect(page.locator('${event.selector}').filter({ hasText: '${cleanedText}' })).toBeVisible();\n\n`;
              } else {
                code += `  await expect(page.getByText('${cleanedText}', { exact: false })).toBeVisible();\n\n`;
              }
            } else {
              const escapedText = escapeTextForAssertion(event.value!);
              code += `  // Assert element contains text: ${event.selector}\n`;
              code += `  await expect(page.locator('${assertionSelector}')).toContainText('${escapedText}');\n\n`;
            }
            break;
          case "isChecked":
            code += `  // Assert checkbox/radio is checked: ${event.selector}\n`;
            code += `  await expect(page.locator('${assertionSelector}')).toBeChecked();\n\n`;
            break;
          case "isNotChecked":
            code += `  // Assert checkbox/radio is not checked: ${event.selector}\n`;
            code += `  await expect(page.locator('${assertionSelector}')).not.toBeChecked();\n\n`;
            break;
        }
        break;
    }
  });

  return code;
}

function escapeTextForAssertion(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .trim();
}

function cleanTextForGetByText(text: string): string {
  if (!text) return "";
  return text.replace(/\s+/g, " ").replace(/\n+/g, " ").trim();
}

function isTextAmbiguous(text: string): boolean {
  if (!text) return true;
  if (text.length < 6) return true;
  if (text.split(/\s+/).length <= 2) return true;
  return false;
}

if (typeof window !== "undefined") {
  (window as any).PlaywrightGenerator = {
    generatePlaywrightTest,
    convertToPlaywrightSelector,
    escapeTextForAssertion,
    cleanTextForGetByText,
    isTextAmbiguous,
  };
  console.log("PlaywrightGenerator loaded and attached to window object");
}

export {
  generatePlaywrightTest,
  escapeTextForAssertion,
  cleanTextForGetByText,
  isTextAmbiguous,
};