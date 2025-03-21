import { Request, Response } from "express";
import {
  SequelizePersonService,
  TypeOrmPersonService,
  PrismaPersonService,
} from "./service.js";

const services = {
  sequelize: new SequelizePersonService(),
  typeorm: new TypeOrmPersonService(),
  prisma: new PrismaPersonService(),
};

export class PersonController {
  public static async getById(req: Request, res: Response) {
    const { orm, id } = req.params;

    if (!services[orm as keyof typeof services]) {
      return res.status(400).json({ error: "Invalid ORM" });
    }

    try {
      const person = await services[orm as keyof typeof services].getById(
        Number(id)
      );
      if (!person) {
        return res.status(404).json({ error: "Person not found" });
      }
      return res.json(person);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  public static async create(req: Request, res: Response) {
    const { orm } = req.params;
    const { name, email } = req.body;

    if (!services[orm as keyof typeof services]) {
      return res.status(400).json({ error: "Invalid ORM" });
    }

    try {
      const person = await services[orm as keyof typeof services].create({
        name,
        email,
      });
      return res.status(201).json(person);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
