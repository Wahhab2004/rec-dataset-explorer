import type { KeyboardEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { BackendImage } from "@/components/explorer/backend-image"

export type DatasetImageCardData = {
  id: string
  filename: string
  imageUrl?: string | null
  timeOfDay: string | null
  weather: string | null
  installationLocation: string | null
  tags: readonly string[]
  annotationSummary: readonly { category: string; count: number }[]
}

export function DatasetImageCard({
  image,
  selected,
  onSelectionChange,
  onOpen,
}: {
  image: DatasetImageCardData
  selected: boolean
  onSelectionChange: (selected: boolean) => void
  onOpen: () => void
}) {
  const displayTags = Array.from(
    new Set([
      image.timeOfDay,
      image.weather,
      image.installationLocation,
      ...image.tags,
    ].filter((tag): tag is string => Boolean(tag)))
  )
  const annotationSummary = image.annotationSummary
    .map(({ category, count }) => `${category} ${count}`)
    .join(" \u00b7 ") || "No annotations"

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) {
      return
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onOpen()
    }
  }

  return (
    <article
      className="cursor-pointer overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-sm"
      onClick={onOpen}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="relative grid aspect-4/3 place-items-center border-b bg-muted/70">
        <input
          type="checkbox"
          aria-label={`Select ${image.filename}`}
          checked={selected}
          onChange={(event) => onSelectionChange(event.target.checked)}
          onClick={(event) => event.stopPropagation()}
          className="absolute top-2.5 left-2.5 size-4 rounded border-input accent-primary"
        />
        <BackendImage src={image.imageUrl} alt={image.filename} />
      </div>

      <div className="space-y-2 p-3">
        <h3 className="truncate text-sm font-medium" title={image.filename}>
          {image.filename}
        </h3>

        <div className="flex min-h-5 flex-wrap gap-1">
          {displayTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="font-normal text-muted-foreground"
            >
              {tag}
            </Badge>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">{annotationSummary}</p>
      </div>
    </article>
  )
}
