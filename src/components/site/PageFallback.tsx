/** Tampilan sementara saat potongan halaman sedang diunduh. */
const PageFallback = () => (
  <div className="min-h-screen" aria-busy="true" aria-label="Memuat halaman">
    <div className="h-[72px] border-b border-border/60 bg-background/80" />
    <div className="container mx-auto px-4 pt-14 space-y-4">
      <div className="h-4 w-40 rounded bg-muted animate-pulse" />
      <div className="h-10 w-2/3 max-w-xl rounded bg-muted animate-pulse" />
      <div className="h-4 w-1/2 max-w-md rounded bg-muted animate-pulse" />
      <div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-56 rounded-2xl bg-muted animate-pulse" />)}
      </div>
    </div>
  </div>
);

export default PageFallback;
