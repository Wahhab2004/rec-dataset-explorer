export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
      <section
        aria-labelledby="page-title"
        className="w-full max-w-xl rounded-lg border bg-card p-6 sm:p-7"
      >
        <header className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground"
          >
            R
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Internal engineering tool
            </p>
            <h1
              id="page-title"
              className="mt-0.5 text-xl font-semibold tracking-tight"
            >
              REC Dataset Explorer
            </h1>
          </div>
        </header>

        <div className="mt-6 border-t pt-5">
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            A focused workspace for inspecting and understanding recommendation
            datasets.
          </p>
          <p className="mt-4 text-xs font-medium text-foreground">
            Frontend foundation configured
          </p>
        </div>
      </section>
    </main>
  );
}
