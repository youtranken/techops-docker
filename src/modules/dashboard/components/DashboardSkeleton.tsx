'use client';

export function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Row 1: 6 stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        ))}
      </div>
      {/* Row 2: 2 panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
      {/* Row 3: performance + donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 h-72 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        <div className="h-72 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
      {/* Row 4: recent + priority + assignees */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 h-56 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        <div className="flex flex-col gap-5">
          <div className="flex-1 h-24 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          <div className="flex-1 h-24 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
