import { DatasetExplorer } from "@/components/explorer/dataset-explorer";

export default async function DatasetExplorerPage({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}) {
  const { datasetId } = await params;
  return <DatasetExplorer key={datasetId} datasetId={datasetId} />;
}
