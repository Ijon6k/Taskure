export default function DashboardLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-surface-l0 min-h-[60vh]">
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="w-10 h-10 rounded-xl bg-surface-l3 border border-theme-subtle" />
        <div className="h-4 w-32 bg-surface-l3 rounded-md" />
        <div className="h-3 w-48 bg-surface-hover rounded-md" />
      </div>
    </div>
  );
}
