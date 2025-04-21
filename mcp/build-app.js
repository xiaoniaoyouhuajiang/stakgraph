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

// Transform-based ESM Import Replacer Plugin (esm.sh imports)
const esmImportReplacer = {
  name: "esm-import-replacer",
  setup(build) {
    // Process all JS files
    build.onLoad({ filter: /\.js$/ }, async (args) => {
      // Read the file content
      const source = await fs.promises.readFile(args.path, "utf8");

      // Replace ESM imports
      const transformed = source.replace(
        /import\s+(.+?)\s+from\s+["']https:\/\/esm\.sh\/([^"']+)["']/g,
        (match, imports, packagePath) => {
          // Handle versioned imports
          packagePath = packagePath.replace(/@\d+\.\d+\.\d+(-\w+)?$/, "");

          // Special case: preserve @org/package format
          if (!packagePath.startsWith("@") && packagePath.includes("@")) {
            packagePath = packagePath.split("@")[0];
          }

          console.log(
            `Transforming import in ${path.basename(args.path)}: ${packagePath}`
          );
          return `import ${imports} from "${packagePath}"`;
        }
      );

      return {
        contents: transformed,
        loader: path.extname(args.path) === ".js" ? "jsx" : undefined,
      };
    });
  },
};

// Build configuration
try {
  await esbuild.build({
    entryPoints: ["app/app.js"],
    bundle: true,
    outfile: "dist/bundle.js",
    format: "esm",
    minify: true,
    plugins: [esmImportReplacer],
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    // Add this line to help with plugin debugging
    logLevel: "info",
  });
  console.log("✅ Build completed successfully!");
} catch (err) {
  console.error("❌ Build failed:", err);
  process.exit(1);
}
