import express from "express";
import { PersonController } from "./controller.js";

export function registerRoutes(app) {
  app.get("/person/:orm/person/:id", (req, res, next) => {
    PersonController.getById(req, res).catch(next);
  });

  app.post("/person/:orm/person", (req, res, next) => {
    PersonController.create(req, res).catch(next);
  });
}
