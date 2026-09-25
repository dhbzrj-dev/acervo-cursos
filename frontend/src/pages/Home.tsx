import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import CategoryPill from "@/components/CategoryPill";
import CourseCard from "@/components/CourseCard";
import CourseCardSkeleton from "@/components/CourseCardSkeleton";
import EmptyState from "@/components/EmptyState";
import { fetchCategories, fetchCourses, fetchMySubscriptions } from "@/lib/api";
import type { Category, Course, UserSubscription } from "@/types";
import { useTelegramBackButton } from "@/hooks/useTelegram";

const ALL_CATEGORY_ID = "all";

export default function Home() {
  useTelegramBackButton(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY_ID);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
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

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribedIds = useMemo(
    () => new Set(subscriptions.map((s) => s.courseId)),
    [subscriptions]
  );

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesCategory =
        activeCategory === ALL_CATEGORY_ID || course.categoryId === activeCategory;
      const matchesQuery = course.name
        .toLowerCase()
        .includes(query.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [courses, activeCategory, query]);

  return (
    <div className="pb-24">
      <Header query={query} onQueryChange={setQuery} />

      {/* Pills de categoria */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
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

      {/* Grid de cursos */}
      <div className="mt-4 px-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <EmptyState
            emoji="🔍"
            title="Nenhum curso encontrado"
            description="Tente buscar por outro termo ou escolher outra categoria."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                isSubscribed={subscribedIds.has(course.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
