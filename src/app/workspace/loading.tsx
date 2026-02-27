export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 text-gray-600 dark:bg-gray-950 dark:text-gray-300">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-transparent blur-xl" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-12 w-12 rounded-2xl border border-gray-200 bg-white/80 shadow-sm dark:border-gray-800 dark:bg-gray-900/80" />
          </div>
        </div>
        <div className="h-2 w-40 rounded-full bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent animate-pulse" />
        <p className="text-sm font-medium">Preparing your workspace...</p>
      </div>
    </div>
  );
}
