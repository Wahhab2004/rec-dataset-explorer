import {
  DatasetImageCard,
  type DatasetImage,
} from "@/components/explorer/dataset-image-card"

export function ImageGrid({ images }: { images: DatasetImage[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {images.map((image) => (
        <DatasetImageCard key={image.id} image={image} />
      ))}
    </div>
  )
}
