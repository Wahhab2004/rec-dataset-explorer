import { DatasetImageCard } from "@/components/explorer/dataset-image-card"
import type { DatasetImage } from "@/lib/dataset-filtering"

export function ImageGrid({ images }: { images: readonly DatasetImage[] }) {
  if (images.length === 0) {
    return (
      <div className="grid min-h-48 place-items-center rounded-lg border border-dashed bg-card px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No images match the current filters.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {images.map((image) => (
        <DatasetImageCard key={image.id} image={image} />
      ))}
    </div>
  )
}
