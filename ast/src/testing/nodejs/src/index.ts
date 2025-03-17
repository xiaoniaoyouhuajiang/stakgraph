import express from "express";
import "reflect-metadata";
import { sequelize, AppDataSource } from "./config.js";
import router from "./routes.js";

const app = express();
const port = 3000;

app.use(express.json());

app.use("/person", router);

async function initDatabases() {
  try {
    await sequelize.sync();

    await AppDataSource.initialize();

    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error(`Error initializing databases: ${error}`);
    process.exit(1);
  }
}

initDatabases();
