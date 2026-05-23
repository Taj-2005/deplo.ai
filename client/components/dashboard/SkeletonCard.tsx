export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-4 border-b border-ds-outline-variant last:border-0">
      <div className="w-8 h-8 bg-ds-surface-highest animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-ds-surface-highest animate-pulse w-1/3" />
        <div className="h-2.5 bg-ds-surface-high animate-pulse w-1/2" />
      </div>
      <div className="h-5 w-16 bg-ds-surface-highest animate-pulse" />
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="border border-ds-outline-variant bg-ds-surface p-6 animate-pulse">
      <div className="h-3 bg-ds-surface-highest w-1/2 mb-4" />
      <div className="h-9 bg-ds-surface-highest w-20 mb-3" />
      <div className="h-2.5 bg-ds-surface-high w-2/3" />
    </div>
  );
}

export function SkeletonRepoCard() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-ds-outline-variant animate-pulse">
      <div className="w-9 h-9 bg-ds-surface-highest" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-ds-surface-highest w-1/4" />
        <div className="h-2.5 bg-ds-surface-high w-1/3" />
      </div>
      <div className="h-8 w-20 bg-ds-surface-highest" />
    </div>
  );
}
