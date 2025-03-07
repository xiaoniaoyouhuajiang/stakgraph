import express, { Request, Response, NextFunction } from "express";
import { mcp_routes } from "./tools/index.js";
import { graph_routes } from "./graph/graph.js";
import fileUpload from "express-fileupload";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiToken = process.env.API_TOKEN;
  if (!apiToken) {
    return next();
  }
  const requestToken = req.header("x-api-token");
  if (!requestToken || requestToken !== apiToken) {
    res.status(401).json({ error: "Unauthorized: Invalid API token" });
    return;
  }
  next();
};
app.use(authMiddleware);

mcp_routes(app);
graph_routes(app);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
