import { createCourseInviteLink } from "../services/inviteLinks.js";

/**
 * Uso:
 *   npm run create-invite-link -- --channel=-1001111111111 --price=1200 --name="React Avançado"
 *
 * Roda uma vez por curso, na hora de cadastrá-lo: cria o link de convite
 * com assinatura paga em Stars e imprime o resultado para copiar direto
 * pra coluna `invite_link` do curso no banco (ou pro seed.ts).
 *
 * Pré-requisito: o bot precisa já ser administrador do canal, com o direito
 * "Convidar usuários via link" (can_invite_users).
 */

function parseArgs(): { channelId: string; price: number; name: string } {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, ...rest] = arg.replace(/^--/, "").split("=");
      return [key, rest.join("=")];
    })
  );

  const channelId = args.channel;
  const price = Number(args.price);
  const name = args.name;

  if (!channelId || !price || !name) {
    console.error(
      'Uso: npm run create-invite-link -- --channel=-100... --price=1200 --name="Nome do curso"'
    );
    process.exit(1);
  }

  return { channelId, price, name };
}

async function main() {
  const { channelId, price, name } = parseArgs();

  const { inviteLink } = await createCourseInviteLink({
    channelId,
    priceStars: price,
    name,
  });

  console.log("\nLink de assinatura criado com sucesso:\n");
  console.log(inviteLink);
  console.log(
    "\nCopie esse valor para a coluna invite_link do curso correspondente (courses.invite_link)."
  );
}

main().catch((err) => {
  console.error("Falha ao criar o invite link:", err);
  process.exit(1);
});
