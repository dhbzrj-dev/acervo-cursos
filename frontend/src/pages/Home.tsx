import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import CategoryPill from "@/components/CategoryPill";
import CourseCard from "@/components/CourseCard";
import CourseCardSkeleton from "@/components/CourseCardSkeleton";
import EmptyState from "@/components/EmptyState";
import { fetchCategories, fetchConfig, fetchCourses, fetchMySubscriptions } from "@/lib/api";
import type { Category, Course, UserSubscription } from "@/types";
import { useTelegramBackButton } from "@/hooks/useTelegram";
import { useFavorites } from "@/hooks/useFavorites";
import { useDragScroll } from "@/hooks/useDragScroll";

const ALL_CATEGORY_ID = "all";
type AccessFilter = "all" | "subscribed" | "available" | "favorites";
type PriceFilter = "all" | "low" | "mid" | "high";
type SortMode = "default" | "newest" | "price";

export default function Home() {
  useTelegramBackButton(false);
  const favorites = useFavorites();
  const categoriesScroll = useDragScroll<HTMLDivElement>();

  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [brlPer100Stars, setBrlPer100Stars] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY_ID);
  const [query, setQuery] = useState("");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    fetchConfig().then((config) => setBrlPer100Stars(config.brlPer100Stars));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(false);
      const [cats, crs, subs] = await Promise.all([
        fetchCategories(),
        fetchCourses(),
        fetchMySubscriptions(),
      ]);
      if (cancelled) return;
      setCategories(cats);
      setCourses(crs);
      setSubscriptions(subs);
      setLoading(false);
    }

    load().catch(() => {
      if (cancelled) return;
      setLoadError(true);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const subscribedIds = useMemo(
    () => new Set(subscriptions.filter((s) => s.active).map((s) => s.courseId)),
    [subscriptions]
  );

  const topId = useMemo(() => {
    let best: Course | null = null;
    for (const course of courses) {
      const n = course.studentsCount ?? 0;
      if (n > 0 && (!best || n > (best.studentsCount ?? 0))) best = course;
    }
    return best?.id ?? null;
  }, [courses]);

  function badgeFor(course: Course): "novo" | "top" | null {
    if (course.id === topId) return "top";
    if (!course.createdAt) return null;
    const age = Date.now() - new Date(course.createdAt).getTime();
    return age < 14 * 24 * 60 * 60 * 1000 ? "novo" : null;
  }

  const filterCount =
    (accessFilter === "all" ? 0 : 1) +
    (priceFilter === "all" ? 0 : 1) +
    (sortMode === "default" ? 0 : 1);

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    const categoryNameById = new Map(
      categories.map((c) => [c.id, c.name.toLowerCase()])
    );

    const list = courses.filter((course) => {
      const matchesCategory =
        activeCategory === ALL_CATEGORY_ID || course.categoryId === activeCategory;

      const isSub = subscribedIds.has(course.id);
      const matchesAccess =
        accessFilter === "all" ||
        (accessFilter === "subscribed" && isSub) ||
        (accessFilter === "available" && !isSub) ||
        (accessFilter === "favorites" && favorites.has(course.id));

      const price = course.priceStars ?? 0;
      const matchesPrice =
        priceFilter === "all" ||
        (priceFilter === "low" && price <= 500) ||
        (priceFilter === "mid" && price > 500 && price <= 1000) ||
        (priceFilter === "high" && price > 1000);

      if (!matchesCategory || !matchesAccess || !matchesPrice) return false;
      if (!q) return true;

      const haystack = [
        course.name,
        course.description,
        categoryNameById.get(course.categoryId) ?? "",
        Array.isArray(course.benefits) ? course.benefits.join(" ") : "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });

    const sorted = [...list];
    if (sortMode === "newest") {
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      );
    } else if (sortMode === "price") {
      sorted.sort((a, b) => (a.priceStars ?? 0) - (b.priceStars ?? 0));
    }
    return sorted;
  }, [
    courses,
    categories,
    activeCategory,
    query,
    accessFilter,
    priceFilter,
    sortMode,
    subscribedIds,
    favorites.ids,
  ]);

  return (
    <div className="pb-24">
      <Header
        query={query}
        onQueryChange={setQuery}
        onOpenFilters={() => setFiltersOpen(true)}
        filterCount={filterCount}
      />

      <div
        ref={categoriesScroll.ref}
        className="no-scrollbar flex cursor-grab gap-2 overflow-x-auto px-4 pb-1"
        onPointerDown={categoriesScroll.onPointerDown}
        onClickCapture={categoriesScroll.onClickCapture}
      >
        <CategoryPill
          category={{ id: ALL_CATEGORY_ID, name: "Todos", emoji: "✨", order: 0 }}
          active={activeCategory === ALL_CATEGORY_ID}
          onClick={() => setActiveCategory(ALL_CATEGORY_ID)}
        />
        {categories.map((cat) => (
          <CategoryPill
            key={cat.id}
            category={cat}
            active={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
          />
        ))}
      </div>

      <div className="mt-4 px-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : loadError ? (
          <EmptyState
            emoji="⚠️"
            title="Não foi possível carregar"
            description="Verifique sua conexão e tente de novo."
            actionLabel="Tentar de novo"
            onAction={() => setReloadKey((k) => k + 1)}
          />
        ) : filteredCourses.length === 0 ? (
          <EmptyState
            emoji="🔍"
            title="Nenhum curso encontrado"
            description="Tente buscar por outro termo ou escolher outro filtro."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                isSubscribed={subscribedIds.has(course.id)}
                isFavorite={favorites.has(course.id)}
                onToggleFavorite={favorites.toggle}
                badge={badgeFor(course)}
                category={activeCategory === ALL_CATEGORY_ID ? categoryById.get(course.categoryId) : null}
                brlPer100Stars={brlPer100Stars}
              />
            ))}
          </div>
        )}
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setFiltersOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-bg p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 text-lg font-semibold">Filtros</h2>
            <p className="mb-2 text-sm text-muted">Acesso</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                ["all", "Todos"],
                ["subscribed", "Já assinei"],
                ["available", "Não assinei"],
                ["favorites", "Favoritos"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAccessFilter(id as AccessFilter)}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    accessFilter === id ? "bg-white text-black" : "bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mb-2 text-sm text-muted">Preço</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                ["all", "Qualquer"],
                ["low", "Até 500 ★"],
                ["mid", "500–1000 ★"],
                ["high", "1000+ ★"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPriceFilter(id as PriceFilter)}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    priceFilter === id ? "bg-white text-black" : "bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mb-2 text-sm text-muted">Ordem</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                ["default", "Padrão"],
                ["newest", "Mais novos"],
                ["price", "Menor preço"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSortMode(id as SortMode)}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    sortMode === id ? "bg-white text-black" : "bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="w-full rounded-xl bg-white p-3 font-semibold text-black"
              onClick={() => setFiltersOpen(false)}
            >
              Ver resultados
            </button>
          </div>
        </div>
      )}
    </div>
  );
}