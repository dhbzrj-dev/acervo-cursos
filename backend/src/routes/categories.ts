import type { FastifyInstance } from "fastify";
import { listCategories } from "../repositories/categories.repo.js";

export async function categoriesRoutes(app: FastifyInstance) {
  // GET /categories — pública, não depende de autenticação.
  app.get("/categories", async () => {
    return listCategories();
  });
}
