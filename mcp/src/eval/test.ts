import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { Request, Response } from "express";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

// Add this route handler function
export async function runPlaywrightTests(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { test } = req.query;

    if (!test || typeof test !== "string") {
      res.status(400).json({ error: "Test parameter is required" });
      return;
    }

    // Validate test parameter to prevent command injection
    const validTestPattern = /^[a-zA-Z0-9_\-\/\*\.]+$/;
    if (!validTestPattern.test(test)) {
      res.status(400).json({ error: "Invalid test name format" });
      return;
    }

    // Check if tests directory exists
    const testsDir = path.join(__dirname, "../../tests");
    try {
      await fs.access(testsDir);
    } catch {
      res.status(404).json({ error: "Tests directory not found" });
      return;
    }

    // Construct the playwright command
    let testPath: string;
    if (test === "all") {
      testPath = ".";
    } else if (test.includes("*")) {
      testPath = test;
    } else {
      // If it's a specific test file, ensure it has proper extension
      testPath =
        test.endsWith(".spec.js") || test.endsWith(".spec.ts")
          ? `tests/${test}`
          : `tests/${test}.spec.js`;
    }

    const command = `npx playwright test --config=tests/playwright.config.js ${testPath}`;

    // Set timeout for the command
    const { stdout, stderr } = await execAsync(command, {
      cwd: path.join(__dirname, "../.."),
      timeout: 60000,
      env: { ...process.env, CI: "true" }, // Set CI mode for consistent output
    });

    res.json({
      success: true,
      testPath,
      output: stdout,
      errors: stderr || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    // Handle different types of errors
    if (error.code === "ENOENT") {
      res.status(500).json({
        success: false,
        error: "Playwright not found. Make sure it's installed.",
        timestamp: new Date().toISOString(),
      });
    } else if (error.killed && error.signal === "SIGTERM") {
      res.status(408).json({
        success: false,
        error: "Test execution timed out",
        timestamp: new Date().toISOString(),
      });
    } else {
      // Test failures will come through here since playwright exits with non-zero code
      res.json({
        success: false,
        testPath: req.query.test as string,
        output: error.stdout || "",
        errors: error.stderr || error.message,
        exitCode: error.code,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
