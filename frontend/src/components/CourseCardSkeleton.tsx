/** Skeleton do CourseCard — mantém a grade estável enquanto os dados carregam. */
export default function CourseCardSkeleton() {
  return (
    <div className="flex flex-col rounded-card bg-surface border border-border overflow-hidden">
      <div className="aspect-[4/3] w-full skeleton" />
      <div className="flex flex-col gap-3 p-3.5">
        <div className="space-y-2">
          <div className="skeleton h-3.5 w-full rounded" />
          <div className="skeleton h-3.5 w-2/3 rounded" />
          <div className="skeleton h-3 w-1/3 rounded mt-1" />
        </div>
        <div className="skeleton h-9 w-full rounded-btn" />
      </div>
    </div>
  );
}
