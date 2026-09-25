import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env.js";
import { categoriesRoutes } from "./routes/categories.js";
import { coursesRoutes } from "./routes/courses.js";
import { meRoutes } from "./routes/me.js";
import { internalRoutes } from "./routes/internal.js";
import { closePool, pool } from "./db/pool.js";

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  },
});

// CORS: só o(s) domínio(s) do Mini App (Vercel) e o dev local podem chamar
// a API a partir do navegador/WebView.
await app.register(cors, {
  origin: env.frontendOrigins.length > 0 ? env.frontendOrigins : true,
});

// Rotas públicas — o catálogo em si não exige autenticação, só as
// assinaturas do usuário (/me/*) e as rotas internas do bot (/internal/*).
await app.register(categoriesRoutes);
await app.register(coursesRoutes);
await app.register(meRoutes);
await app.register(internalRoutes);

app.get("/health", async () => {
  // Ping simples no banco — falha rápido se a DATABASE_URL estiver errada.
  await pool.query("SELECT 1");
  return { status: "ok" };
});

async function start() {
  try {
    await app.listen({ port: env.port, host: "0.0.0.0" });
    app.log.info(`Acervo de Cursos API rodando na porta ${env.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Encerramento gracioso — importante em hosts como Fly.io/Railway, que
// enviam SIGTERM antes de matar o processo em deploys/reinícios.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    app.log.info(`Recebido ${signal}, encerrando...`);
    await app.close();
    await closePool();
    process.exit(0);
  });
}

start();
