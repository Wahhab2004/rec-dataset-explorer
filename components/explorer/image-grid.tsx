import {
  DatasetImageCard,
  type DatasetImageCardData,
} from "@/components/explorer/dataset-image-card"

export type { DatasetImageCardData } from "@/components/explorer/dataset-image-card"

export function ImageGrid({
  images,
  selectedImageIds,
  onSelectionChange,
  onOpenImage,
}: {
  images: readonly DatasetImageCardData[]
  selectedImageIds: ReadonlySet<string>
  onSelectionChange: (imageId: string, selected: boolean) => void
  onOpenImage: (image: DatasetImageCardData) => void
}) {
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
        <DatasetImageCard
          key={image.id}
          image={image}
          selected={selectedImageIds.has(image.id)}
          onSelectionChange={(selected) =>
            onSelectionChange(image.id, selected)
          }
          onOpen={() => onOpenImage(image)}
        />
      ))}
    </div>
  )
}
