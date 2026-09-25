import { pool, closePool } from "../db/pool.js";

/**
 * Mesmos dados usados em `frontend/src/data/mock.ts`, agora como seed real
 * do banco — assim o app se comporta de forma idêntica ao trocar de mock
 * para API sem o usuário perceber diferença.
 */

const categories = [
  { id: "cat-programacao", name: "Programação", emoji: "💻", order: 1 },
  { id: "cat-design", name: "Design", emoji: "🎨", order: 2 },
  { id: "cat-negocios", name: "Negócios", emoji: "📈", order: 3 },
  { id: "cat-idiomas", name: "Idiomas", emoji: "🌍", order: 4 },
  { id: "cat-bemestar", name: "Bem-estar", emoji: "🧘", order: 5 },
];

const courses = [
  {
    id: "curso-react-avancado",
    categoryId: "cat-programacao",
    name: "React Avançado na Prática",
    description:
      "Domine hooks avançados, performance e arquitetura de apps React de verdade, com aulas novas toda semana.",
    benefits: [
      "Aulas novas toda semana",
      "Acesso a todo histórico do canal",
      "Comunidade privada de alunos",
      "Suporte direto com o professor",
    ],
    coverUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80",
    priceStars: 1200,
    inviteLink: "https://t.me/+exemplo_invite_react",
    channelId: "-1001111111111",
  },
  {
    id: "curso-ui-design",
    categoryId: "cat-design",
    name: "UI Design de Produto",
    description:
      "Do wireframe ao protótipo de alta fidelidade: sistemas de design, tipografia e handoff para dev.",
    benefits: [
      "Arquivos Figma exclusivos",
      "Críticas de portfólio ao vivo",
      "Aulas novas toda semana",
      "Comunidade privada de alunos",
    ],
    coverUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80",
    priceStars: 900,
    inviteLink: "https://t.me/+exemplo_invite_design",
    channelId: "-1001111111112",
  },
  {
    id: "curso-vendas-b2b",
    categoryId: "cat-negocios",
    name: "Vendas B2B do Zero ao Fechamento",
    description:
      "Prospecção, discovery e negociação para quem vende para empresas. Estudos de caso reais toda semana.",
    benefits: [
      "Scripts de prospecção prontos",
      "Estudos de caso reais",
      "Comunidade privada de alunos",
      "Suporte direto com o professor",
    ],
    coverUrl: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80",
    priceStars: 1500,
    inviteLink: "https://t.me/+exemplo_invite_vendas",
    channelId: "-1001111111113",
  },
  {
    id: "curso-ingles-fluente",
    categoryId: "cat-idiomas",
    name: "Inglês Fluente para o Trabalho",
    description:
      "Conversação, vocabulário de negócios e pronúncia, com prática guiada toda semana.",
    benefits: [
      "Aulas de conversação semanais",
      "Correção de pronúncia",
      "Acesso a todo histórico do canal",
      "Comunidade privada de alunos",
    ],
    coverUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&q=80",
    priceStars: 700,
    inviteLink: "https://t.me/+exemplo_invite_ingles",
    channelId: "-1001111111114",
  },
  {
    id: "curso-node-backend",
    categoryId: "cat-programacao",
    name: "Backend com Node.js e Postgres",
    description:
      "APIs escaláveis, filas, autenticação e deploy em produção — direto ao ponto, sem enrolação.",
    benefits: [
      "Projetos reais de ponta a ponta",
      "Aulas novas toda semana",
      "Acesso a todo histórico do canal",
      "Suporte direto com o professor",
    ],
    coverUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
    priceStars: 1400,
    inviteLink: "https://t.me/+exemplo_invite_node",
    channelId: "-1001111111115",
  },
  {
    id: "curso-meditacao",
    categoryId: "cat-bemestar",
    name: "Meditação para Rotinas Intensas",
    description:
      "Práticas curtas de respiração e foco pensadas para encaixar em uma rotina corrida.",
    benefits: [
      "Práticas guiadas 3x por semana",
      "Trilhas de áudio exclusivas",
      "Comunidade privada de alunos",
    ],
    coverUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
    priceStars: 500,
    inviteLink: "https://t.me/+exemplo_invite_meditacao",
    channelId: "-1001111111116",
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const cat of categories) {
      await client.query(
        `INSERT INTO categories (id, name, emoji, "order")
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = $2, emoji = $3, "order" = $4`,
        [cat.id, cat.name, cat.emoji, cat.order]
      );
    }

    for (const course of courses) {
      await client.query(
        `INSERT INTO courses
           (id, category_id, name, description, benefits, cover_url, price_stars, invite_link, channel_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
         ON CONFLICT (id) DO UPDATE SET
           category_id = $2, name = $3, description = $4, benefits = $5,
           cover_url = $6, price_stars = $7, invite_link = $8, channel_id = $9`,
        [
          course.id,
          course.categoryId,
          course.name,
          course.description,
          course.benefits,
          course.coverUrl,
          course.priceStars,
          course.inviteLink,
          course.channelId,
        ]
      );
    }

    await client.query("COMMIT");
    console.log(`Seed concluído: ${categories.length} categorias, ${courses.length} cursos.`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

seed()
  .catch((err) => {
    console.error("Falha ao rodar seed:", err);
    process.exitCode = 1;
  })
  .finally(closePool);
