import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCategories, fetchCourses } from "@/lib/api";
import type { Category, Course } from "@/types";
import { useTelegramBackButton } from "@/hooks/useTelegram";

export default function Categories() {
  useTelegramBackButton(false);
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [cats, crs] = await Promise.all([fetchCategories(), fetchCourses()]);
      if (cancelled) return;
      setCategories(cats);
      setCourses(crs);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur pt-[max(1rem,var(--tg-safe-top))] px-4 pb-4">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">Categorias</h1>
      </header>

      <div className="flex flex-col gap-2.5 px-4">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-16 w-full rounded-card" />
            ))
          : categories.map((cat) => {
              const count = courses.filter((c) => c.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/?categoria=${cat.id}`)}
                  className="flex items-center gap-4 rounded-card border border-border bg-surface p-4 text-left active:bg-[#1a1a1a]"
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold text-ink">{cat.name}</p>
                    <p className="text-[12.5px] text-muted">
                      {count} {count === 1 ? "curso" : "cursos"}
                    </p>
                  </div>
                  <ChevronIcon />
                </button>
              );
            })}
      </div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="m9 6 6 6-6 6"
        stroke="#A1A1AA"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
