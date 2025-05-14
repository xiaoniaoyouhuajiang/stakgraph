import * as fs from "fs";
import * as path from "path";

export interface Config {
  github: {
    owner: string;
    repo: string;
  };
  codeSpaceURL: string;
  "2b_base_url": string;
  secret: string;
}

export function loadConfig(configPath: string = "config.json"): Config {
  try {
    const configFilePath = path.resolve(process.cwd(), configPath);
    const configData = fs.readFileSync(configFilePath, "utf8");
    return JSON.parse(configData) as Config;
  } catch (error) {
    console.error(`Error loading config from ${configPath}:`, error);
    throw new Error(`Failed to load configuration: ${error}`);
  }
}
