"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BackendImage } from "@/components/explorer/backend-image"
import type { ImageDetail } from "@/lib/api/datasets"

export function ImageDetailDrawer({
  image,
  onClose,
}: {
  image: ImageDetail | null
  onClose: () => void
}) {
  const [showTxt, setShowTxt] = useState(false)

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

  if (!image) {
    return null
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
            <div className="grid aspect-4/3 place-items-center rounded-lg border bg-muted/70">
              <BackendImage src={image.imageUrl} alt={image.fileName} />
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
