import { useTelegramBackButton } from "@/hooks/useTelegram";

const SUPPORT_HANDLE = "@Olimpocursosreal";
const UPDATED_AT = "4 de outubro de 2026";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. O serviço",
    body: [
      "O Olimpocursos é um catálogo de cursos dentro do Telegram. Cada curso é um canal privado do Telegram, e o acesso é liberado por assinatura mensal paga em Telegram Stars.",
    ],
  },
  {
    title: "2. Assinatura e pagamento",
    body: [
      "O pagamento é feito pelo próprio Telegram, em Stars, no momento em que você entra no canal pelo link de assinatura do curso.",
      "A assinatura renova automaticamente a cada 30 dias, pelo mesmo valor, enquanto você continuar no canal. A renovação é descontada do seu saldo de Stars; se não houver saldo suficiente, a assinatura não é renovada.",
      "No Brasil, as Stars podem ser compradas com Pix.",
      "Para cancelar, basta sair do canal antes da data de renovação. Você recebe um lembrete pelo bot 3 dias antes.",
    ],
  },
  {
    title: "3. Reembolsos e problemas com pagamento",
    body: [
      `Se tiver qualquer problema com um pagamento, fale com o suporte em ${SUPPORT_HANDLE} (ou envie /paysupport ao bot) informando seu @usuário, o curso e a data. Pagamentos em Stars também seguem as regras do Telegram.`,
    ],
  },
  {
    title: "4. Uso do conteúdo",
    body: [
      "O acesso é pessoal e intransferível. É proibido copiar, gravar, revender ou redistribuir o conteúdo dos cursos. Contas que fizerem isso podem ser removidas do canal sem reembolso.",
    ],
  },
  {
    title: "5. Sala (chat)",
    body: [
      "Na Sala você aparece com um apelido aleatório; os outros participantes não veem seu nome nem seu @ do Telegram.",
      "Mensagens ofensivas, spam ou divulgação podem ser apagadas, e quem desrespeitar as regras pode ser impedido de escrever.",
    ],
  },
  {
    title: "6. Privacidade",
    body: [
      "Guardamos apenas o necessário para o app funcionar: seu ID numérico do Telegram, os cursos que você assina com as datas de renovação, seu apelido na Sala e as mensagens que você escreve lá.",
      "Seu nome e sua foto do Telegram aparecem só no seu Perfil, dentro do seu aparelho; não são gravados por nós.",
      "Não vendemos nem compartilhamos seus dados. Os dados ficam em provedores de infraestrutura usados para rodar o app.",
      `Você pode pedir a qualquer momento uma cópia ou a exclusão dos seus dados pelo suporte em ${SUPPORT_HANDLE}.`,
    ],
  },
  {
    title: "7. Alterações",
    body: [
      "Estes termos podem ser atualizados. A data da última atualização fica no topo desta página.",
    ],
  },
];

export default function Termos() {
  useTelegramBackButton(true);

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 bg-bg/95 px-4 pb-4 pt-[max(1rem,var(--tg-safe-top))] backdrop-blur">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">Termos e privacidade</h1>
        <p className="mt-1 text-[12px] text-muted">Atualizado em {UPDATED_AT}</p>
      </header>

      <div className="flex flex-col gap-5 px-4">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-[15px] font-semibold text-ink">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="mt-2 text-[14px] leading-relaxed text-ink/80">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
