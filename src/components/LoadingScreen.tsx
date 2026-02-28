"use client";

export default function LoadingScreen({
  message = "Loading workspace...",
}: {
  message?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 text-gray-900 backdrop-blur dark:bg-gray-950/90 dark:text-gray-100">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white/80 px-6 py-5 shadow-lg shadow-indigo-500/10 transition-opacity dark:border-gray-800 dark:bg-gray-900/80">
        <span className="relative flex h-10 w-10 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400/40" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-indigo-500" />
        </span>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {message}
        </p>
      </div>
    </div>
  );
}
