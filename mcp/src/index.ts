import express, { Express, Request, Response } from "express";
import { mcp_routes } from "./tools/index.js";
import fileUpload from "express-fileupload";
import * as r from "./graph/graph.js";
import * as uploads from "./graph/uploads.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function swagger(req: Request, res: Response) {
  res.sendFile(path.join(__dirname, "../redoc-static.html"));
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

app.get("/", swagger);

app.use(r.authMiddleware);

// Claude: document these endpoints ONLY:
app.get("/nodes", r.get_nodes);
app.get("/search", r.search);
app.get("/map", r.get_map);
app.get("/code", r.get_code);
app.get("/shortest_path", r.get_shortest_path);
app.post("/upload", uploads.upload_files);
app.get("/status/:requestId", uploads.check_status);

// Claude: don't document these endpoints:
app.get("/shortest_path_ref_id", r.get_shortest_path_ref_id);
app.get("/pages", r.get_pages);
app.get("/pages/links", r.get_pages_links);
app.get("/feature_map", r.get_feature_map);
app.get("/feature_code", r.get_feature_code);
app.get("/components/links", r.get_components_links);

mcp_routes(app);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
