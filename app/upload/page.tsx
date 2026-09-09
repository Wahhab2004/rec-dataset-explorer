import { DatasetUploadForm } from "@/components/upload/dataset-upload-form";

export default function UploadPage() {
  return (
    <div className="min-h-svh">
      <header className="border-b bg-card px-6 py-5">
        <h1 className="text-xl font-semibold tracking-tight">Upload Dataset</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a prepared structured computer vision dataset to the server.
        </p>
      </header>
      <div className="px-6 py-6">
        <div className="mx-auto max-w-3xl rounded-xl border bg-card p-5 shadow-sm sm:p-6">
          <DatasetUploadForm />
        </div>
      </div>
    </div>
  );
}
