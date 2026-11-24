export default function AdminLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
      <div className="bg-card border-2 border-border rounded-lg p-5 h-80 space-y-3">
        <div className="h-5 w-44 bg-muted rounded" />
        <div className="h-60 w-full bg-muted/50 rounded-md" />
      </div>
    </div>
  );
}
