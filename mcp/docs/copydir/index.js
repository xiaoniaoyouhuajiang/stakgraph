#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const clipboard = require("clipboardy").default;

// Parse command line arguments
const args = process.argv.slice(2);
const jsonFlag = args.includes("--json");
const dirPath = args.filter((arg) => !arg.startsWith("--"))[0];

// Check if path was provided
if (!dirPath) {
  console.error("Please provide a directory path as an argument");
  process.exit(1);
}

// Check if path exists and is a directory
if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
  console.error(`Error: ${dirPath} is not a valid directory`);
  process.exit(1);
}

// Function to recursively walk a directory
function walkDirectory(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip file_contents.txt to avoid including it in the output
    if (entry.name === "file_contents.txt") continue;

    if (entry.isDirectory()) {
      // Recursively walk subdirectories
      files = files.concat(walkDirectory(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

try {
  // Get all files in the directory and subdirectories
  const allFiles = walkDirectory(dirPath);
  let output = "";
  let jsonOutput = {}; // Changed from array to object

  // Process each file
  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, "utf8");

      if (jsonFlag) {
        // Use the file path as key and content as value
        jsonOutput[file] = content;
      } else {
        output += `${file}\n\`\`\`\n${content}\n\`\`\`\n\n`;
      }
    } catch (err) {
      console.error(`Error reading file ${file}: ${err.message}`);

      if (jsonFlag) {
        // For files with errors, include error message in the value
        jsonOutput[file] = `// Error reading file: ${err.message}`;
      } else {
        output += `${file}\n\`\`\`\n// Error reading file: ${err.message}\n\`\`\`\n\n`;
      }
    }
  }

  // Write the output to the clipboard
  if (jsonFlag) {
    clipboard.write(JSON.stringify(jsonOutput, null, 2));
    console.log("Copied JSON to clipboard");
    console.log(`Total files copied: ${Object.keys(jsonOutput).length}`);
  } else {
    clipboard.write(output);
    const lineCount = output.split("\n").length;
    console.log("Copied to clipboard");
    console.log(`Total lines copied: ${lineCount}`);
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
