import { ReplayStatus, PlaywrightAction, PlaywrightReplayState } from "./types";

let playwrightReplayRef = {
  current: null as {
    actions: PlaywrightAction[];
    status: ReplayStatus;
    currentActionIndex: number;
    testCode: string;
    errors: string[];
    timeouts: number[];
  } | null
};

export function parsePlaywrightTest(testCode: string): PlaywrightAction[] {
  const actions: PlaywrightAction[] = [];
  const lines = testCode.split('\n');
  
  let lineNumber = 0;
  
  for (const line of lines) {
    lineNumber++;
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('import') || 
        trimmed.startsWith('test(') || trimmed.includes('async ({ page })') ||
        trimmed === '}); ' || trimmed === '});') {
      continue;
    }
    
    const commentMatch = line.match(/^\s*\/\/\s*(.+)/);
    const comment = commentMatch ? commentMatch[1] : undefined;
    
    try {
      if (trimmed.includes('page.goto(')) {
        const urlMatch = trimmed.match(/page\.goto\(['"](.*?)['"]\)/);
        if (urlMatch) {
          actions.push({
            type: 'goto',
            value: urlMatch[1],
            comment,
            lineNumber
          });
        }
      }
      
      else if (trimmed.includes('page.setViewportSize(')) {
        const sizeMatch = trimmed.match(/page\.setViewportSize\(\s*{\s*width:\s*(\d+),\s*height:\s*(\d+)\s*}\s*\)/);
        if (sizeMatch) {
          actions.push({
            type: 'setViewportSize',
            options: {
              width: parseInt(sizeMatch[1]),
              height: parseInt(sizeMatch[2])
            },
            comment,
            lineNumber
          });
        }
      }
      
      else if (trimmed.includes('page.waitForLoadState(')) {
        const stateMatch = trimmed.match(/page\.waitForLoadState\(['"](.*?)['"]\)/);
        actions.push({
          type: 'waitForLoadState',
          value: stateMatch ? stateMatch[1] : 'networkidle',
          comment,
          lineNumber
        });
      }
      
      else if (trimmed.includes('page.click(')) {
        const selectorMatch = trimmed.match(/page\.click\(['"](.*?)['"]\)/);
        if (selectorMatch) {
          actions.push({
            type: 'click',
            selector: selectorMatch[1],
            comment,
            lineNumber
          });
        }
      }
      
      else if (trimmed.includes('page.fill(')) {
        const fillMatch = trimmed.match(/page\.fill\(['"](.*?)['"],\s*['"](.*?)['"]\)/);
        if (fillMatch) {
          actions.push({
            type: 'fill',
            selector: fillMatch[1],
            value: fillMatch[2],
            comment,
            lineNumber
          });
        }
      }
      
      else if (trimmed.includes('page.check(')) {
        const selectorMatch = trimmed.match(/page\.check\(['"](.*?)['"]\)/);
        if (selectorMatch) {
          actions.push({
            type: 'check',
            selector: selectorMatch[1],
            comment,
            lineNumber
          });
        }
      }
      
      else if (trimmed.includes('page.uncheck(')) {
        const selectorMatch = trimmed.match(/page\.uncheck\(['"](.*?)['"]\)/);
        if (selectorMatch) {
          actions.push({
            type: 'uncheck',
            selector: selectorMatch[1],
            comment,
            lineNumber
          });
        }
      }
      
      else if (trimmed.includes('page.selectOption(')) {
        const selectMatch = trimmed.match(/page\.selectOption\(['"](.*?)['"],\s*['"](.*?)['"]\)/);
        if (selectMatch) {
          actions.push({
            type: 'selectOption',
            selector: selectMatch[1],
            value: selectMatch[2],
            comment,
            lineNumber
          });
        }
      }
      
      else if (trimmed.includes('page.waitForTimeout(')) {
        const timeoutMatch = trimmed.match(/page\.waitForTimeout\((\d+)\)/);
        if (timeoutMatch) {
          actions.push({
            type: 'waitForTimeout',
            value: parseInt(timeoutMatch[1]),
            comment,
            lineNumber
          });
        }
      }
      
      else if (trimmed.includes('expect(') && trimmed.includes('toBeVisible()')) {
        const expectMatch = trimmed.match(/expect\(page\.(?:locator|getByText)\(['"](.*?)['"]\).*?\)\.toBeVisible\(\)/);
        if (expectMatch) {
          actions.push({
            type: 'expect',
            selector: expectMatch[1],
            expectation: 'toBeVisible',
            comment,
            lineNumber
          });
        }
      }
      
      else if (trimmed.includes('expect(') && trimmed.includes('toContainText(')) {
        const expectMatch = trimmed.match(/expect\(page\.locator\(['"](.*?)['"]\)\)\.toContainText\(['"](.*?)['"]\)/);
        if (expectMatch) {
          actions.push({
            type: 'expect',
            selector: expectMatch[1],
            value: expectMatch[2],
            expectation: 'toContainText',
            comment,
            lineNumber
          });
        }
      }
      
      else if (trimmed.includes('expect(') && trimmed.includes('toBeChecked()')) {
        const expectMatch = trimmed.match(/expect\(page\.locator\(['"](.*?)['"]\)\)\.toBeChecked\(\)/);
        if (expectMatch) {
          actions.push({
            type: 'expect',
            selector: expectMatch[1],
            expectation: 'toBeChecked',
            comment,
            lineNumber
          });
        }
      }
      
      else if (trimmed.includes('expect(') && trimmed.includes('not.toBeChecked()')) {
        const expectMatch = trimmed.match(/expect\(page\.locator\(['"](.*?)['"]\)\)\.not\.toBeChecked\(\)/);
        if (expectMatch) {
          actions.push({
            type: 'expect',
            selector: expectMatch[1],
            expectation: 'not.toBeChecked',
            comment,
            lineNumber
          });
        }
      }
      
    } catch (error) {
      console.warn(`Failed to parse line ${lineNumber}: ${trimmed}`, error);
    }
  }
  
  return actions;
}

async function executePlaywrightAction(action: PlaywrightAction): Promise<void> {
  try {
    switch (action.type) {
      case 'goto':
        if (action.value && typeof action.value === 'string') {
          window.parent.postMessage({
            type: "staktrak-iframe-navigate",
            url: action.value
          }, "*");
        }
        break;
        
      case 'setViewportSize':
        if (action.options) {
          try {
            if (window.top === window) {
              window.resizeTo(action.options.width, action.options.height);
            }
          } catch (e) {
            console.warn('Cannot resize viewport in iframe context');
          }
        }
        break;
        
      case 'waitForLoadState':
        break;
        
      case 'click':
        if (action.selector) {
          const element = await waitForElement(action.selector);
          if (element) {
            const htmlElement = element as HTMLElement;
            element.scrollIntoView({ behavior: 'auto', block: 'center' });
            
            const originalBorder = htmlElement.style.border;
            htmlElement.style.border = '3px solid #ff6b6b';
            htmlElement.style.boxShadow = '0 0 10px rgba(255, 107, 107, 0.5)';
            
            htmlElement.click();
            
            setTimeout(() => {
              htmlElement.style.border = originalBorder;
              htmlElement.style.boxShadow = '';
            }, 300);
          } else {
            throw new Error(`Element not found: ${action.selector}`);
          }
        }
        break;
        
      case 'fill':
        if (action.selector && action.value !== undefined) {
          const element = await waitForElement(action.selector) as HTMLInputElement | HTMLTextAreaElement;
          if (element) {
            element.scrollIntoView({ behavior: 'auto', block: 'center' });
            
            element.focus();
            element.value = '';
            element.value = String(action.value);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            throw new Error(`Input element not found: ${action.selector}`);
          }
        }
        break;
        
      case 'check':
        if (action.selector) {
          const element = await waitForElement(action.selector) as HTMLInputElement;
          if (element && (element.type === 'checkbox' || element.type === 'radio')) {
            element.scrollIntoView({ behavior: 'auto', block: 'center' });
            
            if (!element.checked) {
              element.click();
            }
          } else {
            throw new Error(`Checkbox/radio element not found: ${action.selector}`);
          }
        }
        break;
        
      case 'uncheck':
        if (action.selector) {
          const element = await waitForElement(action.selector) as HTMLInputElement;
          if (element && element.type === 'checkbox') {
            element.scrollIntoView({ behavior: 'auto', block: 'center' });
            
            if (element.checked) {
              element.click();
            }
          } else {
            throw new Error(`Checkbox element not found: ${action.selector}`);
          }
        }
        break;
        
      case 'selectOption':
        if (action.selector && action.value !== undefined) {
          const element = await waitForElement(action.selector) as HTMLSelectElement;
          if (element && element.tagName === 'SELECT') {
            element.scrollIntoView({ behavior: 'auto', block: 'center' });
            
            element.value = String(action.value);
            element.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            throw new Error(`Select element not found: ${action.selector}`);
          }
        }
        break;
        
      case 'waitForTimeout':
        const shortDelay = Math.min(action.value as number, 500);
        await new Promise(resolve => setTimeout(resolve, shortDelay));
        break;
        
      case 'expect':
        if (action.selector) {
          await verifyExpectation(action);
        }
        break;
        
      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  } catch (error) {
    console.error(`Error executing action: ${action.type}`, error);
    throw error;
  }
}

async function waitForElement(selector: string, timeout = 3000): Promise<Element | null> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      let element: Element | null = null;
      
      if (selector.includes(':has-text(')) {
        const match = selector.match(/^(.+?):has-text\("(.+?)"\)$/);
        if (match) {
          const [, baseSelector, text] = match;
          const elements = document.querySelectorAll(baseSelector);
          for (const el of Array.from(elements)) {
            const elementText = el.textContent?.trim() || '';
            if (elementText === text.trim() || elementText.includes(text.trim())) {
              element = el;
              break;
            }
          }
        }
      } else if (selector.startsWith('text=')) {
        const textMatch = selector.match(/text=["']?([^"']+)["']?/);
        if (textMatch) {
          const text = textMatch[1];
          const allElements = document.querySelectorAll('*');
          for (const el of Array.from(allElements)) {
            const elementText = el.textContent?.trim() || '';
            if (elementText === text.trim()) {
              element = el;
              break;
            }
          }
        }
      } else if (selector.startsWith('xpath=')) {
        const xpath = selector.substring(6);
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        element = result.singleNodeValue as Element;
      } else {
        element = document.querySelector(selector);
      }
      
      if (element) {
        return element;
      }
    } catch (error) {
      console.warn(`Error finding element with selector: ${selector}`, error);
    }
  }
  
  return null;
}

async function verifyExpectation(action: PlaywrightAction): Promise<void> {
  if (!action.selector) return;
  
  const element = await waitForElement(action.selector);
  
  switch (action.expectation) {
    case 'toBeVisible':
      if (!element || !isElementVisible(element)) {
        throw new Error(`Element is not visible: ${action.selector}`);
      }
      break;
      
    case 'toContainText':
      if (!element || !element.textContent?.includes(String(action.value || ''))) {
        throw new Error(`Element does not contain text "${action.value}": ${action.selector}`);
      }
      break;
      
    case 'toBeChecked':
      const checkedElement = element as HTMLInputElement;
      if (!checkedElement || !checkedElement.checked) {
        throw new Error(`Element is not checked: ${action.selector}`);
      }
      break;
      
    case 'not.toBeChecked':
      const uncheckedElement = element as HTMLInputElement;
      if (!uncheckedElement || uncheckedElement.checked) {
        throw new Error(`Element should not be checked: ${action.selector}`);
      }
      break;
      
    default:
      console.warn(`Unknown expectation: ${action.expectation}`);
  }
}

function isElementVisible(element: Element): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         element.getBoundingClientRect().width > 0 &&
         element.getBoundingClientRect().height > 0;
}



export function startPlaywrightReplay(testCode: string): void {
  try {
    const actions = parsePlaywrightTest(testCode);
    
    if (actions.length === 0) {
      throw new Error('No valid actions found in test code');
    }
    
    playwrightReplayRef.current = {
      actions,
      status: ReplayStatus.PLAYING,
      currentActionIndex: 0,
      testCode,
      errors: [],
      timeouts: []
    };
    
    window.parent.postMessage({ 
      type: "staktrak-playwright-replay-started",
      totalActions: actions.length,
      actions: actions
    }, "*");
    
    executeNextPlaywrightAction();
    
  } catch (error) {
    console.error('Failed to start Playwright replay:', error);
    window.parent.postMessage({ 
      type: "staktrak-playwright-replay-error",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, "*");
  }
}

async function executeNextPlaywrightAction(): Promise<void> {
  const state = playwrightReplayRef.current;
  if (!state || state.status !== ReplayStatus.PLAYING) {
    return;
  }
  
  if (state.currentActionIndex >= state.actions.length) {
    state.status = ReplayStatus.COMPLETED;
    window.parent.postMessage({ 
      type: "staktrak-playwright-replay-completed" 
    }, "*");
    return;
  }
  
  const action = state.actions[state.currentActionIndex];
  
  try {
    window.parent.postMessage({ 
      type: "staktrak-playwright-replay-progress",
      current: state.currentActionIndex + 1,
      total: state.actions.length,
      action: action
    }, "*");
    
    await executePlaywrightAction(action);
    
    state.currentActionIndex++;
    
    setTimeout(() => {
      executeNextPlaywrightAction();
    }, 300);
    
  } catch (error) {
    console.error(`Error executing action ${state.currentActionIndex}:`, error);
    state.errors.push(`Action ${state.currentActionIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    state.currentActionIndex++;
    
    window.parent.postMessage({ 
      type: "staktrak-playwright-replay-error",
      error: error instanceof Error ? error.message : 'Unknown error',
      actionIndex: state.currentActionIndex - 1,
      action: action
    }, "*");
    
    executeNextPlaywrightAction();
  }
}

export function pausePlaywrightReplay(): void {
  const state = playwrightReplayRef.current;
  if (state) {
    state.status = ReplayStatus.PAUSED;
    
    state.timeouts.forEach(id => clearTimeout(id as any));
    state.timeouts = [];
    
    window.parent.postMessage({ type: "staktrak-playwright-replay-paused" }, "*");
  }
}

export function resumePlaywrightReplay(): void {
  const state = playwrightReplayRef.current;
  if (state && state.status === ReplayStatus.PAUSED) {
    state.status = ReplayStatus.PLAYING;
    
    executeNextPlaywrightAction();
    
    window.parent.postMessage({ type: "staktrak-playwright-replay-resumed" }, "*");
  }
}

export function stopPlaywrightReplay(): void {
  const state = playwrightReplayRef.current;
  if (state) {
    state.status = ReplayStatus.IDLE;
    
    state.timeouts.forEach(id => clearTimeout(id as any));
    state.timeouts = [];
    
    window.parent.postMessage({ type: "staktrak-playwright-replay-stopped" }, "*");
  }
}

export function getPlaywrightReplayState(): PlaywrightReplayState | null {
  const state = playwrightReplayRef.current;
  if (!state) return null;
  
  return {
    actions: state.actions,
    status: state.status,
    currentActionIndex: state.currentActionIndex,
    testCode: state.testCode,
    errors: state.errors
  };
}

export function initPlaywrightReplay(): void {
  window.addEventListener("message", (event) => {
    const { data } = event;
    
    if (!data || !data.type) return;
    
    switch (data.type) {
      case "staktrak-playwright-replay-start":
        if (data.testCode) {
          startPlaywrightReplay(data.testCode);
        }
        break;
        
      case "staktrak-playwright-replay-pause":
        pausePlaywrightReplay();
        break;
        
      case "staktrak-playwright-replay-resume":
        resumePlaywrightReplay();
        break;
        
      case "staktrak-playwright-replay-stop":
        stopPlaywrightReplay();
        break;
        
      case "staktrak-playwright-replay-ping":
        const currentState = getPlaywrightReplayState();
        window.parent.postMessage({ 
          type: "staktrak-playwright-replay-pong", 
          state: currentState 
        }, "*");
        break;
    }
  });
}

if (typeof window !== "undefined") {
  (window as any).PlaywrightReplay = {
    parsePlaywrightTest,
    startPlaywrightReplay,
    pausePlaywrightReplay,
    resumePlaywrightReplay,
    stopPlaywrightReplay,
    getPlaywrightReplayState,
    initPlaywrightReplay
  };
}
