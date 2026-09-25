import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

export const env = {
  botToken: required("BOT_TOKEN"),
  miniAppUrl: required("MINI_APP_URL"),
  backendUrl: required("BACKEND_URL"),
  internalApiKey: required("INTERNAL_API_KEY"),
};
