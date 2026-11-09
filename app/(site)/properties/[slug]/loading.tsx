export default function LoadingResidence() {
  return (
    <div aria-busy="true" aria-label="Loading residence">
      <section data-nav-theme="dark" className="relative h-[100svh] bg-obsidian overflow-hidden">
        <div className="absolute inset-0 bg-obsidian-3/60 animate-pulse" />
        <div className="absolute inset-x-0 bottom-0 shell pb-14">
          <div className="h-3 w-64 bg-ivory/10" />
          <div className="mt-7 h-[clamp(3.4rem,10vw,9rem)] w-2/3 max-w-3xl bg-ivory/[0.07]" />
        </div>
      </section>
    </div>
  );
}
