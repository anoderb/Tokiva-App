export default function KasirLoading() {
  return (
    <div className="min-h-screen bg-bg p-4 space-y-4 animate-pulse">
      <div className="h-14 bg-card border-2 border-border rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-[72vh] bg-card border-2 border-border rounded-lg" />
        <div className="h-[72vh] bg-card border-2 border-border rounded-lg" />
      </div>
    </div>
  );
}
