"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Eye, EyeOff, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ImageDetail } from "@/lib/api/datasets"
import { resolveBackendFileUrl } from "@/lib/api/file-url"

function displayCategory(category: string) {
  return category.replace(/[-_]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatArea(area: number) {
  return area.toFixed(4)
}

export function ImageDetailDrawer({
  image,
  excludedAnnotationIds,
  onToggleAnnotation,
  onRestoreAll,
  onClose,
}: {
  image: ImageDetail | null
  excludedAnnotationIds: Set<string>
  onToggleAnnotation: (annotationId: string) => void
  onRestoreAll: () => void
  onClose: () => void
}) {
  const [showTxt, setShowTxt] = useState(false)
  const [showAnnotations, setShowAnnotations] = useState(false)
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null)
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null)
  const annotationRowRefs = useRef(new Map<string, HTMLDivElement>())

  useEffect(() => {
    if (!image) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [image, onClose])

  useEffect(() => {
    if (!activeAnnotationId) {
      return
    }

    annotationRowRefs.current.get(activeAnnotationId)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    })
  }, [activeAnnotationId])

  if (!image) {
    return null
  }

  const annotationsByCategory = (() => {
    const counts = new Map<string, number>()
    return image.annotations.map((annotation) => {
      const nextCount = (counts.get(annotation.category) ?? 0) + 1
      counts.set(annotation.category, nextCount)
      return { annotation, number: nextCount }
    })
  })()
  const excludedCount = image.annotations.filter((annotation) => excludedAnnotationIds.has(annotation.id)).length
  const imageUrl = resolveBackendFileUrl(image.imageUrl)

  function selectAnnotation(annotationId: string) {
    setActiveAnnotationId(annotationId)
  }

  function closeDrawer() {
    setShowTxt(false)
    onClose()
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close image details"
        className="fixed inset-0 z-30 cursor-default bg-foreground/20 backdrop-blur-[1px]"
        onClick={closeDrawer}
      />
      <aside
        aria-labelledby="image-detail-title"
        className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l bg-card shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Image details</p>
            <h2
              id="image-detail-title"
              className="mt-1 truncate text-sm font-semibold"
              title={image.fileName}
            >
              {image.fileName}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close image details"
            onClick={closeDrawer}
          >
            <X aria-hidden="true" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          <section aria-labelledby="original-preview-title">
            <h3
              id="original-preview-title"
              className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Original image preview
            </h3>
            <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-lg border bg-muted/70 p-2">
              {imageUrl ? (
                <div className="relative inline-block max-h-80 max-w-full leading-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt={image.fileName} className="block max-h-80 max-w-full object-contain" />
                  {showAnnotations ? image.annotations.map((annotation) => {
                    const isExcluded = excludedAnnotationIds.has(annotation.id)
                    const isSelected = activeAnnotationId === annotation.id
                    const isHovered = hoveredAnnotationId === annotation.id
                    const zIndex = isSelected ? 30 : isHovered ? 20 : 10
                    return (
                      <button
                        key={annotation.id}
                        type="button"
                        aria-label={`${displayCategory(annotation.category)} annotation${isExcluded ? ", excluded" : ""}`}
                        className={`absolute overflow-visible border-2 text-left outline-none transition-[border-color,opacity,box-shadow] focus-visible:ring-2 focus-visible:ring-amber-300 ${isExcluded ? "border-dashed border-amber-500/80 bg-amber-300/10 opacity-65" : "border-emerald-400/90 bg-emerald-300/10"} ${isSelected ? "border-amber-400 bg-amber-300/25 opacity-100 shadow-[0_0_0_2px_rgba(255,255,255,0.9)]" : ""}`}
                        style={{
                          left: `${(annotation.xCenter - annotation.width / 2) * 100}%`,
                          top: `${(annotation.yCenter - annotation.height / 2) * 100}%`,
                          width: `${annotation.width * 100}%`,
                          height: `${annotation.height * 100}%`,
                          zIndex,
                        }}
                        onMouseEnter={() => setHoveredAnnotationId(annotation.id)}
                        onMouseLeave={() => setHoveredAnnotationId(null)}
                        onFocus={() => setHoveredAnnotationId(annotation.id)}
                        onBlur={() => setHoveredAnnotationId(null)}
                        onClick={() => selectAnnotation(annotation.id)}
                      >
                        <span className={`absolute left-0 top-0 -translate-y-full whitespace-nowrap rounded px-1 py-0.5 text-[10px] font-semibold leading-none ${isExcluded ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>
                          {displayCategory(annotation.category)}{isExcluded ? " · Excluded" : ""}
                        </span>
                      </button>
                    )
                  }) : null}
                </div>
              ) : (
                <p className="px-4 py-12 text-sm text-muted-foreground">Image preview unavailable.</p>
              )}
            </div>
          </section>

          <section aria-labelledby="image-metadata-title">
            <h3 id="image-metadata-title" className="mb-2 text-sm font-semibold">
              Image Metadata
            </h3>
            <dl className="divide-y rounded-lg border text-sm">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 px-3 py-2.5">
                <dt className="text-muted-foreground">Time of Day</dt>
                <dd className="text-right font-medium">
                  {image.metadata.timeOfDay ?? "Not provided"}
                </dd>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 px-3 py-2.5">
                <dt className="text-muted-foreground">Weather</dt>
                <dd className="text-right font-medium">
                  {image.metadata.weather ?? "Not provided"}
                </dd>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 px-3 py-2.5">
                <dt className="text-muted-foreground">Installation Location</dt>
                <dd className="text-right font-medium">
                  {image.metadata.installationLocation ?? "Not provided"}
                </dd>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 px-3 py-2.5">
                <dt className="text-muted-foreground">Location</dt>
                <dd className="text-right font-medium">
                  {image.metadata.location ?? "Not provided"}
                </dd>
              </div>
              <div className="space-y-2 px-3 py-2.5">
                <dt className="text-muted-foreground">Additional Tags</dt>
                <dd className="flex flex-wrap gap-1">
                  {image.metadata.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="font-normal">
                      {tag}
                    </Badge>
                  ))}
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="annotation-summary-title">
            <h3
              id="annotation-summary-title"
              className="mb-2 text-sm font-semibold"
            >
              Annotation Summary
            </h3>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Category
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {image.annotationSummary.map(({ category, count }) => (
                    <tr key={category}>
                      <td className="px-3 py-2">{category}</td>
                      <td className="px-3 py-2 text-right font-medium">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="annotation-preview-title">
            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
              <div>
                <h3 id="annotation-preview-title" className="text-sm font-semibold">Show Annotations</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {showAnnotations ? "Bounding boxes are visible on the image." : "The original image is shown without overlays."}
                </p>
              </div>
              <Button
                type="button"
                variant={showAnnotations ? "secondary" : "outline"}
                size="sm"
                aria-pressed={showAnnotations}
                onClick={() => setShowAnnotations((current) => !current)}
              >
                {showAnnotations ? <EyeOff data-icon="inline-start" /> : <Eye data-icon="inline-start" />}
                {showAnnotations ? "Hide" : "Show"}
              </Button>
            </div>
          </section>

          <section aria-labelledby="annotations-title">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="annotations-title" className="text-sm font-semibold">Annotations</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {image.annotations.length} annotations · {excludedCount} excluded from export
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRestoreAll}
                disabled={excludedCount === 0}
              >
                Restore All
              </Button>
            </div>
            <p className="mt-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Excluded annotations are removed only from the exported dataset. The original dataset remains unchanged.
            </p>
            <div className="mt-3 space-y-2">
              {annotationsByCategory.map(({ annotation, number }) => {
                const isExcluded = excludedAnnotationIds.has(annotation.id)
                const isActive = activeAnnotationId === annotation.id
                return (
                  <div
                    key={annotation.id}
                    ref={(element) => {
                      if (element) {
                        annotationRowRefs.current.set(annotation.id, element)
                      } else {
                        annotationRowRefs.current.delete(annotation.id)
                      }
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${isActive ? "border-amber-400 bg-amber-50" : "hover:bg-muted/50"}`}
                    onMouseEnter={() => setHoveredAnnotationId(annotation.id)}
                    onMouseLeave={() => setHoveredAnnotationId(null)}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onFocus={() => setHoveredAnnotationId(annotation.id)}
                      onBlur={() => setHoveredAnnotationId(null)}
                      onClick={() => selectAnnotation(annotation.id)}
                    >
                      <span className="block truncate text-sm font-medium">
                        {displayCategory(annotation.category)} #{number}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {annotation.width.toFixed(2)} × {annotation.height.toFixed(2)} · area {formatArea(annotation.area)}
                      </span>
                    </button>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className={`text-xs font-semibold ${isExcluded ? "text-amber-700" : "text-emerald-700"}`}>
                        {isExcluded ? "Excluded" : "Keep"}
                      </span>
                      <button
                        type="button"
                        tabIndex={0}
                        aria-label={isExcluded ? `Restore ${displayCategory(annotation.category)} #${number}` : `Exclude ${displayCategory(annotation.category)} #${number} from export`}
                        className={`grid size-7 place-items-center rounded-md border text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring ${isExcluded ? "border-amber-300 bg-amber-100 text-amber-800" : "border-emerald-300 bg-emerald-50 text-emerald-700"}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          onToggleAnnotation(annotation.id)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            event.stopPropagation()
                            onToggleAnnotation(annotation.id)
                          }
                        }}
                      >
                        {isExcluded ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
                      </button>
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          <section aria-labelledby="annotation-file-title">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 id="annotation-file-title" className="text-sm font-semibold">
                  Original Annotation File
                </h3>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                  {image.annotationFile.fileName}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTxt((current) => !current)}
                aria-expanded={showTxt}
              >
                {showTxt ? "Hide TXT" : "View TXT"}
              </Button>
            </div>
            {showTxt ? (
              <pre className="mt-3 max-h-64 overflow-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-6 whitespace-pre-wrap">
                {image.annotationFile.content}
              </pre>
            ) : null}
          </section>
        </div>
      </aside>
    </>
  )
}
