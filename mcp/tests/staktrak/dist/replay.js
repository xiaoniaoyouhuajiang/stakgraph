"use strict";
var stakReplay = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: !0 });
    },
    __copyProps = (to, from, except, desc) => {
      if ((from && typeof from == "object") || typeof from == "function")
        for (let key of __getOwnPropNames(from))
          !__hasOwnProp.call(to, key) &&
            key !== except &&
            __defProp(to, key, {
              get: () => from[key],
              enumerable:
                !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
            });
      return to;
    };
  var __toCommonJS = (mod) =>
    __copyProps(__defProp({}, "__esModule", { value: !0 }), mod);
  var replay_exports = {};
  __export(replay_exports, {
    DEFAULT_SPEED: () => DEFAULT_SPEED,
    INITIAL_DELAY: () => INITIAL_DELAY,
    MAX_DELAY: () => MAX_DELAY,
    MIN_DELAY: () => MIN_DELAY,
    convertToReplayActions: () => convertToReplayActions,
    createCursor: () => createCursor,
    createFallbackActions: () => createFallbackActions,
    createReplayStyles: () => createReplayStyles,
    executeAction: () => executeAction,
    findElement: () => findElement,
    highlightElement: () => highlightElement,
    initReplay: () => initReplay,
    moveCursorToElement: () => moveCursorToElement,
    selectOption: () => selectOption,
    showClickEffect: () => showClickEffect,
    typeText: () => typeText,
  });
  var DEFAULT_SPEED = 1,
    MIN_DELAY = 1e3,
    MAX_DELAY = 5e3,
    INITIAL_DELAY = 2e3;
  function convertToReplayActions(trackingData) {
    var _a;
    if (!trackingData)
      return (
        console.error("No tracking data provided to convertToReplayActions"),
        []
      );
    console.log("Converting tracking data to replay actions:", trackingData);
    let actions = [];
    try {
      let { clicks, inputChanges, formElementChanges } = trackingData;
      ((_a = clicks == null ? void 0 : clicks.clickDetails) != null &&
        _a.length &&
        clicks.clickDetails.forEach(([x, y, selector, timestamp]) => {
          if (!selector || selector === "undefined" || selector === "null") {
            console.warn("Skipping click with invalid selector:", selector);
            return;
          }
          let cleanSelector = selector.trim();
          try {
            (document.querySelector(cleanSelector),
              actions.push({
                type: "click",
                selector: cleanSelector,
                timestamp,
                x,
                y,
              }));
          } catch (e) {
            if (
              (console.warn(
                `Invalid selector in click event: ${cleanSelector}. Attempting to fix.`,
              ),
              cleanSelector.includes("data-testid="))
            )
              try {
                let testIdMatch = cleanSelector.match(/data-testid="([^"]+)"/);
                if (testIdMatch && testIdMatch[1]) {
                  let simpleSelector = `[data-testid="${testIdMatch[1]}"]`;
                  try {
                    (document.querySelector(simpleSelector),
                      actions.push({
                        type: "click",
                        selector: simpleSelector,
                        timestamp,
                        x,
                        y,
                      }));
                  } catch (err) {
                    actions.push({
                      type: "click",
                      selector: "[data-testid]",
                      timestamp,
                      x,
                      y,
                    });
                  }
                }
              } catch (err) {
                console.error(
                  "Failed to create valid selector from data-testid",
                  err,
                );
              }
            else if (cleanSelector.includes("class="))
              try {
                let classMatch = cleanSelector.match(/class="([^"]+)"/);
                if (classMatch && classMatch[1]) {
                  let classNames = classMatch[1].split(" ");
                  if (classNames.length > 0) {
                    let simpleSelector = `.${classNames[0]}`;
                    (document.querySelector(simpleSelector),
                      actions.push({
                        type: "click",
                        selector: simpleSelector,
                        timestamp,
                        x,
                        y,
                      }));
                  }
                }
              } catch (err) {
                console.error(
                  "Failed to create valid selector from class",
                  err,
                );
              }
            else if (cleanSelector.includes("id="))
              try {
                let idMatch = cleanSelector.match(/id="([^"]+)"/);
                if (idMatch && idMatch[1]) {
                  let simpleSelector = `#${idMatch[1]}`;
                  (document.querySelector(simpleSelector),
                    actions.push({
                      type: "click",
                      selector: simpleSelector,
                      timestamp,
                      x,
                      y,
                    }));
                }
              } catch (err) {
                console.error("Failed to create valid selector from id", err);
              }
            else {
              let tagMatch = cleanSelector.match(/^([a-zA-Z]+)/);
              if (tagMatch && tagMatch[1])
                try {
                  let simpleSelector = tagMatch[1];
                  (document.querySelector(simpleSelector),
                    actions.push({
                      type: "click",
                      selector: simpleSelector,
                      timestamp,
                      x,
                      y,
                    }));
                } catch (err) {
                  console.error(
                    "Failed to create valid selector from tag name",
                    err,
                  );
                }
            }
          }
        }),
        inputChanges != null &&
          inputChanges.length &&
          inputChanges
            .filter((change) => change.action === "complete" || !change.action)
            .forEach((change) => {
              if (
                !change.elementSelector.includes('type="checkbox"') &&
                !change.elementSelector.includes('type="radio"')
              )
                try {
                  (document.querySelector(change.elementSelector),
                    actions.push({
                      type: "input",
                      selector: change.elementSelector,
                      value: change.value,
                      timestamp: change.timestamp,
                    }));
                } catch (e) {
                  if (
                    (console.warn(
                      `Invalid selector in input: ${change.elementSelector}, attempting to fix`,
                    ),
                    change.elementSelector.includes("data-testid="))
                  ) {
                    let testIdMatch = change.elementSelector.match(
                      /data-testid="([^"]+)"/,
                    );
                    testIdMatch &&
                      testIdMatch[1] &&
                      actions.push({
                        type: "input",
                        selector: `[data-testid="${testIdMatch[1]}"]`,
                        value: change.value,
                        timestamp: change.timestamp,
                      });
                  }
                }
            }),
        formElementChanges != null &&
          formElementChanges.length &&
          formElementChanges.forEach((change) => {
            if (change.elementSelector)
              try {
                (document.querySelector(change.elementSelector),
                  change.type === "checkbox" || change.type === "radio"
                    ? actions.push({
                        type: change.checked ? "check" : "uncheck",
                        selector: change.elementSelector,
                        value: change.value,
                        timestamp: change.timestamp,
                      })
                    : change.type === "select" &&
                      actions.push({
                        type: "select",
                        selector: change.elementSelector,
                        value: change.value,
                        timestamp: change.timestamp,
                      }));
              } catch (e) {
                if (
                  (console.warn(
                    `Invalid selector in form element: ${change.elementSelector}, attempting to fix`,
                  ),
                  change.elementSelector.includes("data-testid="))
                ) {
                  let testIdMatch = change.elementSelector.match(
                    /data-testid="([^"]+)"/,
                  );
                  if (testIdMatch && testIdMatch[1]) {
                    let selector = `[data-testid="${testIdMatch[1]}"]`;
                    change.type === "checkbox" || change.type === "radio"
                      ? actions.push({
                          type: change.checked ? "check" : "uncheck",
                          selector,
                          value: change.value,
                          timestamp: change.timestamp,
                        })
                      : change.type === "select" &&
                        actions.push({
                          type: "select",
                          selector,
                          value: change.value,
                          timestamp: change.timestamp,
                        });
                  }
                }
              }
          }));
    } catch (e) {
      console.error("Error processing tracking data", e);
    }
    if (actions.length === 0) {
      console.warn(
        "No actions extracted from tracking data, creating fallbacks",
      );
      try {
        let testIdButtons = document.querySelectorAll("[data-testid]"),
          timestamp = Date.now();
        if (
          (testIdButtons.forEach((button, index) => {
            actions.push({
              type: "click",
              selector: `[data-testid="${button.getAttribute("data-testid")}"]`,
              timestamp: timestamp + index * 1e3,
              x: 100,
              y: 100,
            });
          }),
          actions.length === 0)
        ) {
          let commonSelectors = ["button", "a", "input", "#app"];
          ((timestamp = Date.now()),
            commonSelectors.forEach((selector, index) => {
              document.querySelectorAll(selector).length > 0 &&
                actions.push({
                  type: "click",
                  selector,
                  timestamp: timestamp + index * 1e3,
                  x: 100,
                  y: 100,
                });
            }));
        }
      } catch (e) {
        console.error("Error creating fallback actions", e);
      }
    }
    actions.sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 1; i < actions.length; i++)
      actions[i].timestamp - actions[i - 1].timestamp < 600 &&
        (actions[i].timestamp = actions[i - 1].timestamp + 600);
    return (console.log("Converted replay actions:", actions), actions);
  }
  function findElement(selector) {
    var _a;
    let element = document.querySelector(selector);
    if (!element) {
      if (selector.includes("data-testid=")) {
        let testId =
          (_a = selector.match(/data-testid="([^"]+)"/)) == null
            ? void 0
            : _a[1];
        testId &&
          (element = document.querySelector(`[data-testid="${testId}"]`));
      }
      if (!element && selector.includes(".")) {
        let classes = selector.match(/\.([^\s.#\[\]]+)/g);
        if (classes && classes.length > 0) {
          let className = classes[0].substring(1);
          element = document.querySelector(`.${className}`);
        }
      }
      if (!element && selector.includes("#")) {
        let ids = selector.match(/#([^\s.#\[\]]+)/g);
        if (ids && ids.length > 0) {
          let id = ids[0].substring(1);
          element = document.querySelector(`#${id}`);
        }
      }
    }
    return element;
  }
  function createCursor() {
    let cursor = document.createElement("div");
    return (
      (cursor.className = "replay-cursor"),
      (cursor.style.position = "fixed"),
      (cursor.style.width = "24px"),
      (cursor.style.height = "24px"),
      (cursor.style.borderRadius = "50%"),
      (cursor.style.backgroundColor = "rgba(255, 0, 0, 0.6)"),
      (cursor.style.border = "2px solid white"),
      (cursor.style.boxShadow = "0 0 10px rgba(255, 0, 0, 0.8)"),
      (cursor.style.zIndex = "9999"),
      (cursor.style.pointerEvents = "none"),
      (cursor.style.display = "none"),
      (cursor.style.transform = "translate(-50%, -50%)"),
      (cursor.style.transition =
        "transform 0.5s ease-in-out, left 0.5s ease-in-out, top 0.5s ease-in-out"),
      document.body.appendChild(cursor),
      cursor
    );
  }
  function createReplayStyles() {
    let style = document.createElement("style");
    return (
      (style.textContent = `
    .replay-overlay {
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 15px;
      border-radius: 8px;
      z-index: 9999;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.7);
      max-width: 300px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      transition: opacity 1.5s ease-out;
      border: 2px solid #3b82f6;
    }
    
    .replay-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .replay-info h3 {
      margin: 0 0 5px 0;
      font-size: 18px;
      color: #3b82f6;
      font-weight: bold;
    }
    
    .replay-progress {
      font-size: 14px;
      font-weight: 500;
    }
    
    .replay-action {
      font-size: 13px;
      word-break: break-all;
      opacity: 0.9;
    }
    
    .replay-status-text {
      font-weight: bold;
      margin-top: 5px;
      color: #10b981;
    }
    
    .replay-overlay.fade-out {
      opacity: 0;
    }
    
    @keyframes click-ripple {
      0% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -50%) scale(8);
        opacity: 0;
      }
    }
    
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.03); }
      100% { transform: scale(1); }
    }
    
    .replay-pulse {
      animation: pulse 0.5s ease-in-out infinite;
    }
  `),
      document.head.appendChild(style),
      style
    );
  }
  function showClickEffect(cursorRef) {
    if (!cursorRef.current) return;
    let ripple = document.createElement("div");
    ((ripple.className = "click-ripple"),
      (ripple.style.position = "fixed"),
      (ripple.style.left = cursorRef.current.style.left),
      (ripple.style.top = cursorRef.current.style.top),
      (ripple.style.transform = "translate(-50%, -50%)"),
      (ripple.style.width = "20px"),
      (ripple.style.height = "20px"),
      (ripple.style.background = "rgba(255, 0, 0, 0.5)"),
      (ripple.style.borderRadius = "50%"),
      (ripple.style.zIndex = "9998"),
      (ripple.style.pointerEvents = "none"),
      (ripple.style.animation = "click-ripple 1s ease-out forwards"),
      document.body.appendChild(ripple),
      (cursorRef.current.style.transform = "translate(-50%, -50%) scale(0.8)"),
      setTimeout(() => {
        cursorRef.current &&
          (cursorRef.current.style.transform =
            "translate(-50%, -50%) scale(1)");
      }, 200),
      setTimeout(() => {
        ripple.parentNode && ripple.parentNode.removeChild(ripple);
      }, 1e3));
  }
  function highlightElement(element, speedRef) {
    let originalOutline = element.style.outline,
      originalBoxShadow = element.style.boxShadow,
      originalZIndex = element.style.zIndex,
      originalTransition = element.style.transition;
    ((element.style.transition = "all 0.3s ease-in-out"),
      (element.style.outline = "3px solid #ff3333"),
      (element.style.boxShadow = "0 0 15px rgba(255, 51, 51, 0.7)"),
      (element.style.zIndex = "1000"),
      element.classList.add("replay-pulse"),
      setTimeout(() => {
        element &&
          ((element.style.outline = originalOutline),
          (element.style.boxShadow = originalBoxShadow),
          (element.style.zIndex = originalZIndex),
          (element.style.transition = originalTransition),
          element.classList.remove("replay-pulse"));
      }, 2e3 / speedRef.current));
  }
  function moveCursorToElement(element, cursorRef, statusRef) {
    return new Promise((resolve) => {
      if (!element || !cursorRef.current || statusRef.current !== "playing") {
        resolve();
        return;
      }
      let rect = element.getBoundingClientRect(),
        targetX = rect.left + rect.width / 2,
        targetY = rect.top + rect.height / 2;
      ((cursorRef.current.style.display = "block"),
        element.scrollIntoView({ behavior: "smooth", block: "center" }),
        setTimeout(() => {
          (cursorRef.current &&
            ((cursorRef.current.style.left = `${targetX}px`),
            (cursorRef.current.style.top = `${targetY}px`)),
            setTimeout(resolve, 800));
        }, 400));
    });
  }
  function typeText(
    element,
    value,
    speedRef,
    statusRef,
    isTypingRef,
    registerTimeout,
  ) {
    return new Promise((resolve) => {
      if (statusRef.current !== "playing") {
        resolve();
        return;
      }
      ((isTypingRef.current = !0), element.focus(), (element.value = ""));
      let index = 0,
        typeChar = () => {
          if (statusRef.current !== "playing") {
            ((isTypingRef.current = !1), resolve());
            return;
          }
          index < value.length
            ? ((element.value += value[index]),
              element.dispatchEvent(new Event("input", { bubbles: !0 })),
              index++,
              registerTimeout(setTimeout(typeChar, 100 / speedRef.current)))
            : (element.dispatchEvent(new Event("change", { bubbles: !0 })),
              (isTypingRef.current = !1),
              resolve());
        };
      typeChar();
    });
  }
  function selectOption(element, value, speedRef, statusRef, registerTimeout) {
    return new Promise((resolve) => {
      if (statusRef.current !== "playing") {
        resolve();
        return;
      }
      (element.focus(),
        registerTimeout(
          setTimeout(() => {
            (statusRef.current === "playing" &&
              ((element.value = value),
              element.dispatchEvent(new Event("change", { bubbles: !0 }))),
              resolve());
          }, 500 / speedRef.current),
        ));
    });
  }
  function createFallbackActions() {
    let actions = [],
      timestamp = Date.now();
    try {
      let selectors = [
        '[data-testid="staktrak-div"]',
        "button.staktrak-div",
        "#staktrak-div",
        "button",
        "a",
        "input",
        "#app",
      ];
      for (let selector of selectors)
        try {
          let element = document.querySelector(selector);
          if (element) {
            let rect = element.getBoundingClientRect();
            if (
              (actions.push({
                type: "click",
                selector,
                timestamp,
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
              }),
              (timestamp += 1e3),
              actions.length >= 3)
            )
              break;
          }
        } catch (e) {
          console.error(`Error creating fallback action for ${selector}:`, e);
        }
    } catch (e) {
      console.error("Error creating fallback actions:", e);
    }
    return actions;
  }
  async function executeAction(
    index,
    actionsRef,
    statusRef,
    cursorRef,
    speedRef,
    isTypingRef,
    registerTimeout,
    setCurrentActionIndex,
    setStatus,
    timeoutRef,
  ) {
    if (statusRef.current !== "playing") return;
    if (window.replayOverlay) {
      let progressEl = window.replayOverlay.querySelector(".replay-progress"),
        actionEl = window.replayOverlay.querySelector(".replay-action"),
        statusEl = window.replayOverlay.querySelector(".replay-status-text");
      (progressEl &&
        (progressEl.textContent = `Step ${index + 1} of ${actionsRef.current.length}`),
        statusEl && (statusEl.textContent = "Playing"));
    }
    if (index >= actionsRef.current.length) {
      if (
        (setCurrentActionIndex(actionsRef.current.length - 1),
        setStatus("completed"),
        window.replayOverlay)
      ) {
        let progressEl = window.replayOverlay.querySelector(".replay-progress"),
          actionEl = window.replayOverlay.querySelector(".replay-action"),
          statusEl = window.replayOverlay.querySelector(".replay-status-text");
        (progressEl &&
          (progressEl.textContent = `Step ${actionsRef.current.length} of ${actionsRef.current.length}`),
          actionEl && (actionEl.textContent = "Completed"),
          statusEl &&
            ((statusEl.textContent = "Completed"),
            (statusEl.style.color = "#10b981")));
      }
      (window.parent.postMessage(
        {
          type: "staktrak-replay-completed",
          totalActions: actionsRef.current.length,
        },
        "*",
      ),
        setTimeout(() => {
          (window.parent.postMessage({ type: "staktrak-replay-fadeout" }, "*"),
            window.replayOverlay &&
              (window.replayOverlay.classList.add("fade-out"),
              setTimeout(() => {
                window.replayOverlay &&
                  window.replayOverlay.parentNode &&
                  (window.replayOverlay.parentNode.removeChild(
                    window.replayOverlay,
                  ),
                  (window.replayOverlay = null));
              }, 1500)));
        }, 3e3),
        cursorRef.current && (cursorRef.current.style.display = "none"));
      return;
    }
    let action = actionsRef.current[index];
    if (window.replayOverlay) {
      let actionEl = window.replayOverlay.querySelector(".replay-action");
      if (actionEl) {
        let actionText = "";
        switch (action.type) {
          case "click":
            actionText = `Clicking: ${action.selector}`;
            break;
          case "input":
            actionText = `Typing into: ${action.selector}`;
            break;
          case "select":
            actionText = `Selecting option in: ${action.selector}`;
            break;
          case "check":
            actionText = `Checking: ${action.selector}`;
            break;
          case "uncheck":
            actionText = `Unchecking: ${action.selector}`;
            break;
          default:
            actionText = `Action: ${action.type} on ${action.selector}`;
        }
        actionEl.textContent = actionText;
      }
    }
    try {
      let element = findElement(action.selector);
      if (
        (element ||
          (await new Promise((resolve) => setTimeout(resolve, 500)),
          (element = findElement(action.selector))),
        !element)
      ) {
        if (
          (console.error(
            `Element not found: ${action.selector}, trying simpler selector`,
          ),
          action.selector.includes("data-testid"))
        ) {
          let testIdMatch = action.selector.match(/data-testid="([^"]+)"/);
          testIdMatch &&
            testIdMatch[1] &&
            (element = document.querySelector(
              `[data-testid="${testIdMatch[1]}"]`,
            ));
        } else if (action.selector.includes("class=")) {
          let classMatch = action.selector.match(/class="([^"]+)"/);
          if (classMatch && classMatch[1]) {
            let classNames = classMatch[1].split(" ");
            classNames.length > 0 &&
              (element = document.querySelector(`.${classNames[0]}`));
          }
        } else if (action.selector.includes("#")) {
          let idMatch = action.selector.match(/#([^\s.>]+)/);
          idMatch &&
            idMatch[1] &&
            (element = document.getElementById(idMatch[1]));
        }
        if (!element && action.selector.match(/^[a-zA-Z]+/)) {
          let tagMatch = action.selector.match(/^([a-zA-Z]+)/);
          if (tagMatch && tagMatch[1]) {
            let elements = document.getElementsByTagName(tagMatch[1]);
            elements.length > 0 && (element = elements[0]);
          }
        }
      }
      if (!element) {
        (console.error(
          `Element not found after all attempts: ${action.selector}, skipping action`,
        ),
          registerTimeout(
            setTimeout(() => {
              statusRef.current === "playing" &&
                (setCurrentActionIndex(index + 1),
                executeAction(
                  index + 1,
                  actionsRef,
                  statusRef,
                  cursorRef,
                  speedRef,
                  isTypingRef,
                  registerTimeout,
                  setCurrentActionIndex,
                  setStatus,
                  timeoutRef,
                ));
            }, 1e3),
          ));
        return;
      }
      if (
        (setCurrentActionIndex(index),
        window.parent.postMessage(
          {
            type: "staktrak-replay-progress",
            currentAction: index,
            totalActions: actionsRef.current.length,
            action,
          },
          "*",
        ),
        await moveCursorToElement(element, cursorRef, statusRef),
        statusRef.current !== "playing")
      )
        return;
      switch ((highlightElement(element, speedRef), action.type)) {
        case "click":
          (showClickEffect(cursorRef),
            element.scrollIntoView({ behavior: "smooth", block: "center" }),
            await new Promise((resolve) => setTimeout(resolve, 300)));
          try {
            element.focus();
          } catch (e) {
            console.warn("Could not focus element:", e);
          }
          try {
            (element.dispatchEvent(
              new MouseEvent("mousedown", {
                bubbles: !0,
                cancelable: !0,
                view: window,
              }),
            ),
              await new Promise((resolve) => setTimeout(resolve, 50)),
              element.dispatchEvent(
                new MouseEvent("mouseup", {
                  bubbles: !0,
                  cancelable: !0,
                  view: window,
                }),
              ),
              await new Promise((resolve) => setTimeout(resolve, 50)),
              element.click(),
              element.dispatchEvent(
                new MouseEvent("click", {
                  bubbles: !0,
                  cancelable: !0,
                  view: window,
                }),
              ));
          } catch (clickError) {
            console.error("Error during click operation:", clickError);
          }
          await new Promise((resolve) => setTimeout(resolve, 300));
          break;
        case "input":
          await typeText(
            element,
            action.value || "",
            speedRef,
            statusRef,
            isTypingRef,
            registerTimeout,
          );
          break;
        case "select":
          await selectOption(
            element,
            action.value || "",
            speedRef,
            statusRef,
            registerTimeout,
          );
          break;
        case "check":
          ((element.checked = !0),
            element.dispatchEvent(new Event("change", { bubbles: !0 })));
          break;
        case "uncheck":
          ((element.checked = !1),
            element.dispatchEvent(new Event("change", { bubbles: !0 })));
          break;
      }
      if (statusRef.current !== "playing") return;
      let nextAction = actionsRef.current[index + 1],
        delay = MIN_DELAY;
      if (nextAction && action.timestamp && nextAction.timestamp) {
        let timeDiff = nextAction.timestamp - action.timestamp;
        delay =
          Math.max(MIN_DELAY, Math.min(MAX_DELAY, timeDiff)) / speedRef.current;
      }
      timeoutRef.current = registerTimeout(
        setTimeout(() => {
          statusRef.current === "playing"
            ? (setCurrentActionIndex(index + 1),
              executeAction(
                index + 1,
                actionsRef,
                statusRef,
                cursorRef,
                speedRef,
                isTypingRef,
                registerTimeout,
                setCurrentActionIndex,
                setStatus,
                timeoutRef,
              ))
            : console.warn(
                `Not moving to next action because status is ${statusRef.current}`,
              );
        }, delay),
      );
    } catch (error) {
      (console.error("Error executing action:", error),
        window.parent.postMessage(
          { type: "staktrak-replay-error", error: error.message, action },
          "*",
        ),
        statusRef.current === "playing" &&
          (timeoutRef.current = registerTimeout(
            setTimeout(() => {
              (setCurrentActionIndex(index + 1),
                executeAction(
                  index + 1,
                  actionsRef,
                  statusRef,
                  cursorRef,
                  speedRef,
                  isTypingRef,
                  registerTimeout,
                  setCurrentActionIndex,
                  setStatus,
                  timeoutRef,
                ));
            }, 2e3),
          )));
    }
  }
  function initReplay(options) {
    window.convertToReplayActions = convertToReplayActions;
    let replayStyles = createReplayStyles(),
      cursor = createCursor();
    ((window.cursorRef = { current: cursor }),
      (window.statusRef = { current: "idle" }),
      (window.speedRef = { current: DEFAULT_SPEED }),
      (window.actionsRef = { current: [] }),
      (window.currentActionIndexRef = { current: 0 }),
      (window.isTypingRef = { current: !1 }),
      (window.timeoutIdsRef = { current: [] }),
      (window.timeoutRef = { current: null }),
      (window.replayOverlay = null),
      (window.registerTimeout = (timeoutId) => (
        window.timeoutIdsRef.current.push(timeoutId),
        timeoutId
      )),
      (window.clearAllTimeouts = () => {
        (window.timeoutIdsRef.current.forEach(clearTimeout),
          (window.timeoutIdsRef.current = []));
      }),
      (window.pauseReplay = () => {
        if (window.statusRef.current === "playing") {
          if (((window.statusRef.current = "paused"), window.replayOverlay)) {
            let statusEl = window.replayOverlay.querySelector(
              ".replay-status-text",
            );
            statusEl && (statusEl.textContent = "Paused");
          }
          window.parent.postMessage({ type: "staktrak-replay-paused" }, "*");
        }
      }),
      (window.resumeReplay = () => {
        if (window.statusRef.current === "paused") {
          if (((window.statusRef.current = "playing"), window.replayOverlay)) {
            let statusEl = window.replayOverlay.querySelector(
              ".replay-status-text",
            );
            statusEl && (statusEl.textContent = "Playing");
          }
          (executeAction(
            window.currentActionIndexRef.current,
            window.actionsRef,
            window.statusRef,
            window.cursorRef,
            window.speedRef,
            window.isTypingRef,
            window.registerTimeout,
            (index) => {
              window.currentActionIndexRef.current = index;
            },
            (status) => {
              window.statusRef.current = status;
            },
            window.timeoutRef,
          ),
            window.parent.postMessage(
              { type: "staktrak-replay-resumed" },
              "*",
            ));
        }
      }),
      (window.stopReplay = () => {
        (window.clearAllTimeouts(),
          (window.statusRef.current = "idle"),
          window.cursorRef.current &&
            (window.cursorRef.current.style.display = "none"),
          window.replayOverlay &&
            window.replayOverlay.parentNode &&
            (window.replayOverlay.parentNode.removeChild(window.replayOverlay),
            (window.replayOverlay = null)),
          document.querySelectorAll(".click-ripple").forEach((ripple) => {
            ripple.parentNode && ripple.parentNode.removeChild(ripple);
          }),
          document.querySelectorAll(".replay-pulse").forEach((element) => {
            (element.classList.remove("replay-pulse"),
              (element.style.outline = ""),
              (element.style.boxShadow = ""));
          }),
          window.parent.postMessage({ type: "staktrak-replay-stopped" }, "*"));
      }),
      window.addEventListener("message", (event) => {
        let { data } = event;
        if (!(!data || !data.type))
          switch (data.type) {
            case "staktrak-replay-actions":
              window.actionsRef.current = data.actions || [];
              break;
            case "staktrak-replay-start":
              (window.clearAllTimeouts(),
                (window.statusRef.current = "playing"),
                (window.currentActionIndexRef.current = 0),
                (window.speedRef.current = data.speed || DEFAULT_SPEED),
                window.replayOverlay ||
                  ((window.replayOverlay = document.createElement("div")),
                  (window.replayOverlay.className = "replay-overlay"),
                  (window.replayOverlay.style.zIndex = "10000"),
                  (window.replayOverlay.innerHTML = `
            <div class="replay-info">
              <h3>Replaying Test</h3>
              <div class="replay-progress">Step 0 of ${window.actionsRef.current.length}</div>
              <div class="replay-action">Starting...</div>
              <div class="replay-status-text">Playing</div>
            </div>
          `),
                  document.body.appendChild(window.replayOverlay),
                  window.replayOverlay.getBoundingClientRect()),
                window.cursorRef.current &&
                  (window.cursorRef.current.style.display = "block"),
                setTimeout(() => {
                  executeAction(
                    0,
                    window.actionsRef,
                    window.statusRef,
                    window.cursorRef,
                    window.speedRef,
                    window.isTypingRef,
                    window.registerTimeout,
                    (index) => {
                      window.currentActionIndexRef.current = index;
                    },
                    (status) => {
                      window.statusRef.current = status;
                    },
                    window.timeoutRef,
                  );
                }, INITIAL_DELAY));
              break;
            case "staktrak-replay-pause":
              window.pauseReplay();
              break;
            case "staktrak-replay-resume":
              window.resumeReplay();
              break;
            case "staktrak-replay-stop":
              window.stopReplay();
              break;
            case "staktrak-replay-speed":
              window.speedRef.current = data.speed || DEFAULT_SPEED;
              break;
            case "staktrak-replay-ping":
              window.parent.postMessage({ type: "staktrak-replay-ready" }, "*");
              break;
          }
      }),
      window.parent.postMessage({ type: "staktrak-replay-ready" }, "*"));
  }
  document.addEventListener("DOMContentLoaded", () => {
    initReplay();
  });
  return __toCommonJS(replay_exports);
})();
