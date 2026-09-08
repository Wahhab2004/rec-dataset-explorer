export default async function DatasetPlaceholderPage(
  props: PageProps<"/datasets/[datasetId]">,
) {
  const { datasetId } = await props.params;

  return (
    <div className="min-h-svh">
      <header className="border-b bg-card">
        <div className="mx-auto w-full max-w-7xl px-6 py-5">
          <p className="text-xs font-medium text-muted-foreground">Datasets</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            Dataset placeholder
          </h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-6 py-5">
        <p className="text-sm text-muted-foreground">
          The Dataset Explorer will be added in a future step.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Dataset ID:{" "}
          <code className="font-mono text-foreground">{datasetId}</code>
        </p>
      </div>
    </div>
  );
}
