import "dotenv/config";

/**
 * Carrega e valida as variáveis de ambiente uma única vez, no boot do
 * processo. Preferimos falhar cedo (e alto) a deixar o servidor subir com
 * uma configuração incompleta e falhar de forma confusa em produção.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required("DATABASE_URL"),
  botToken: required("BOT_TOKEN"),
  frontendOrigins: (process.env.FRONTEND_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  initDataMaxAgeSeconds: Number(process.env.INIT_DATA_MAX_AGE_SECONDS ?? 86400),
  internalApiKey: required("INTERNAL_API_KEY"),
};
