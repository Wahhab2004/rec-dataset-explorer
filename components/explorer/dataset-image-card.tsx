import { ImageIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"

export type DatasetImage = {
  id: string
  filename: string
  tags: string[]
  annotationSummary: string
}

export function DatasetImageCard({ image }: { image: DatasetImage }) {
  return (
    <article className="overflow-hidden rounded-lg border bg-card">
      <div className="relative grid aspect-[4/3] place-items-center border-b bg-muted/70">
        <input
          type="checkbox"
          aria-label={`Select ${image.filename}`}
          className="absolute top-2.5 left-2.5 size-4 rounded border-input accent-primary"
        />
        <ImageIcon
          aria-hidden="true"
          className="size-9 stroke-[1.25] text-muted-foreground/70"
        />
      </div>

      <div className="space-y-2 p-3">
        <h3 className="truncate text-sm font-medium" title={image.filename}>
          {image.filename}
        </h3>

        <div className="flex min-h-5 flex-wrap gap-1">
          {image.tags.map((tag, index) => (
            <Badge
              key={`${tag}-${index}`}
              variant="secondary"
              className="font-normal text-muted-foreground"
            >
              {tag}
            </Badge>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {image.annotationSummary}
        </p>
      </div>
    </article>
  )
}
