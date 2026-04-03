export default function LoadingSkeleton({ cards = 4, rows = 5 }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="card-panel">
            <div className="skeleton h-4 w-24 rounded-full" />
            <div className="mt-5 skeleton h-10 w-28 rounded-2xl" />
            <div className="mt-4 skeleton h-4 w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="table-shell p-4">
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="skeleton h-12 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
