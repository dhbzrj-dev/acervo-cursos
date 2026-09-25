import { NavLink } from "react-router-dom";

/**
 * Bottom navigation fixa. Ícones em SVG inline (sem dependência extra) para
 * manter o bundle enxuto — cada ícone tem um estado "ativo" em branco puro
 * e "inativo" em cinza (muted), seguindo o alto contraste do design system.
 */

const items = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/categorias", label: "Categorias", icon: GridIcon },
  { to: "/meus-cursos", label: "Meus cursos", icon: BookIcon },
  { to: "/perfil", label: "Perfil", icon: UserIcon },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-bg/95 backdrop-blur pb-[max(0.5rem,var(--tg-safe-bottom))]">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 pt-2">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              [
                "flex flex-1 flex-col items-center gap-1 rounded-btn py-1.5 text-[11px] font-medium transition-colors",
                isActive ? "text-ink" : "text-muted",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

type IconProps = { active: boolean };
const strokeOf = (active: boolean) => (active ? "#FFFFFF" : "#A1A1AA");

function HomeIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 11.5 12 4l8 7.5"
        stroke={strokeOf(active)}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 10v9a1 1 0 0 0 1 1h3v-5a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v5h3a1 1 0 0 0 1-1v-9"
        stroke={strokeOf(active)}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GridIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke={strokeOf(active)} strokeWidth="2" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" stroke={strokeOf(active)} strokeWidth="2" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" stroke={strokeOf(active)} strokeWidth="2" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" stroke={strokeOf(active)} strokeWidth="2" />
    </svg>
  );
}

function BookIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 4.5A1.5 1.5 0 0 1 6.5 3H18a1 1 0 0 1 1 1v15.5a.5.5 0 0 1-.5.5H7a2 2 0 0 1-2-2V4.5Z"
        stroke={strokeOf(active)}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M5 17.5A1.5 1.5 0 0 1 6.5 16H19" stroke={strokeOf(active)} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.5" stroke={strokeOf(active)} strokeWidth="2" />
      <path
        d="M4.5 20c1.2-3.5 4-5.5 7.5-5.5s6.3 2 7.5 5.5"
        stroke={strokeOf(active)}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
