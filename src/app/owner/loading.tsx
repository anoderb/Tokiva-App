export default function OwnerLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Top KPI Skeleton */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border-2 border-border rounded-md p-4 h-24 flex flex-col justify-between"
          >
            <div className="w-8 h-8 rounded-sm bg-muted" />
            <div className="space-y-1.5">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-2.5 w-16 bg-muted/70 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border-2 border-border rounded-lg p-5 h-72 space-y-3">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="h-3 w-56 bg-muted/70 rounded" />
          <div className="h-48 w-full bg-muted/50 rounded-md mt-2" />
        </div>
        <div className="bg-card border-2 border-border rounded-lg p-5 h-72 space-y-3">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="h-3 w-56 bg-muted/70 rounded" />
          <div className="h-48 w-full bg-muted/50 rounded-md mt-2" />
        </div>
      </div>
    </div>
  );
}
