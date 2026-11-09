export default function LoadingCollection() {
  return (
    <div aria-busy="true" aria-label="Loading residences">
      <section data-nav-theme="dark" className="bg-obsidian">
        <div className="shell pt-[calc(var(--nav-h)+7rem)] pb-24">
          <div className="h-3 w-40 bg-ivory/10" />
          <div className="mt-8 h-[clamp(3.4rem,10vw,10rem)] w-3/4 max-w-3xl bg-ivory/[0.07]" />
        </div>
      </section>
      <section className="bg-soft-white">
        <div className="shell pt-10">
          <div className="h-[3.6rem] border border-ink/10 skeleton" />
          <div className="mt-8 h-10 w-56 skeleton" />
        </div>
        <div className="shell pt-14 pb-28 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={i === 0 ? "md:col-span-2" : undefined}>
              <div className="skeleton" style={{ aspectRatio: i === 0 ? "16 / 10" : "4 / 5" }} />
              <div className="mt-5 h-3 w-1/3 skeleton" />
              <div className="mt-3 h-7 w-2/3 skeleton" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
