import type { FastifyInstance } from "fastify";
import { findCourseById, listActiveCourses } from "../repositories/courses.repo.js";

export async function coursesRoutes(app: FastifyInstance) {
  // GET /courses — lista todos os cursos ativos. Pública: o catálogo em si
  // não é sensível, só as assinaturas do usuário (/me/subscriptions) são.
  app.get("/courses", async () => {
    return listActiveCourses();
  });

  // GET /courses/:id
  app.get<{ Params: { id: string } }>("/courses/:id", async (request, reply) => {
    const course = await findCourseById(request.params.id);
    if (!course) {
      reply.code(404).send({ error: "Curso não encontrado." });
      return;
    }
    return course;
  });
}
