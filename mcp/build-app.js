// build.js
import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Make sure the dist directory exists
if (!fs.existsSync("dist")) {
  fs.mkdirSync("dist");
}

// Function to copy files
function copyFile(source, destination) {
  try {
    const content = fs.readFileSync(source, "utf8");
    fs.writeFileSync(destination, content);
    console.log(`✅ Copied ${source} to ${destination}`);
  } catch (err) {
    console.error(`❌ Failed to copy ${source} to ${destination}:`, err);
  }
}

// Copy static files to dist
const staticFiles = [
  { source: "app/index.html", destination: "dist/index.html" },
  { source: "app/styles.css", destination: "dist/styles.css" },
];

// Create dist directory if it doesn't exist
if (!fs.existsSync("dist")) {
  fs.mkdirSync("dist");
}

// Copy all static files
staticFiles.forEach((file) => {
  copyFile(file.source, file.destination);
});

// Function to recursively get all JS files in a directory
function getJSFilesInDirectory(directory) {
  const files = [];
  function scanDirectory(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        files.push(fullPath);
      }
    }
  }
  scanDirectory(directory);
  return files;
}

// The simplest approach: modify the source files to use local imports
async function modifySourceFiles() {
  // Get all JS files in the app directory
  const files = getJSFilesInDirectory("app");
  console.log(`Found ${files.length} JavaScript files to process`);

  const tempDir = path.join(__dirname, "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  for (const file of files) {
    if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, "utf8");

      // Replace remote imports with local imports
      content = content.replace(
        /import\s+?(\{[^}]*\}|\w+)\s+from\s+["']https:\/\/esm\.sh\/([^"']+)["']/g,
        'import $1 from "$2"'
      );
      // Create the same directory structure in temp
      const relativePath = path.relative("app", file);
      const tempFile = path.join(tempDir, relativePath);
      // Make sure the directory exists for the file
      const tempFileDir = path.dirname(tempFile);
      if (!fs.existsSync(tempFileDir)) {
        fs.mkdirSync(tempFileDir, { recursive: true });
      }
      fs.writeFileSync(tempFile, content);
      console.log(`✅ Modified imports in ${file}`);
    }
  }
  return tempDir;
}

try {
  // Process source files first
  const tempDir = await modifySourceFiles();

  await esbuild.build({
    entryPoints: [path.join(tempDir, "app.js")],
    bundle: true,
    outfile: "dist/app.js",
    format: "esm",
    minify: true,
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    platform: "browser",
    nodePaths: ["node_modules"],
    resolveExtensions: [".js", ".jsx", ".ts", ".tsx"],
    logLevel: "info",
    loader: {
      ".js": "jsx",
    },
    sourcemap: true,
    // Add the temp directory to the list of resolve directories
    absWorkingDir: process.cwd(),
    mainFields: ["module", "main"],
  });
  console.log("✅ Build completed successfully!");

  // Clean up temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log("✅ Cleaned up temporary files");
} catch (err) {
  console.error("❌ Build failed:", err);
  process.exit(1);
}
