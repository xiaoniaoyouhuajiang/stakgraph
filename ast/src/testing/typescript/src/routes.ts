import express from "express";
import { PersonController } from "./controller.js";

const router = express.Router();

router.get("/:orm/person/:id", (req, res, next) => {
  PersonController.getById(req, res).catch(next);
});
router.post("/:orm/person", (req, res, next) => {
  PersonController.create(req, res).catch(next);
});

export default router;
