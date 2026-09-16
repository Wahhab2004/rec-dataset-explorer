"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check, Eye, EyeOff, Maximize2, Minus, Plus, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ImageDetail } from "@/lib/api/datasets"
import { resolveBackendFileUrl } from "@/lib/api/file-url"

type InspectorTab = "annotations" | "metadata" | "txt"

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
  const [activeTab, setActiveTab] = useState<InspectorTab>("annotations")
  const [showAnnotations, setShowAnnotations] = useState(false)
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null)
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [translation, setTranslation] = useState({ x: 0, y: 0 })
  const [fitSize, setFitSize] = useState<{ width: number; height: number } | null>(null)
  const imageStageRef = useRef<HTMLDivElement>(null)
  const imageCanvasRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const annotationRowRefs = useRef(new Map<string, HTMLDivElement>())

  const fitImageToStage = useCallback((naturalWidth: number, naturalHeight: number) => {
    const stage = imageStageRef.current
    if (!stage || naturalWidth <= 0 || naturalHeight <= 0) return

    const availableWidth = Math.max(0, stage.clientWidth - 32)
    const availableHeight = Math.max(0, stage.clientHeight - 32)
    const fitScale = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight)
    setFitSize({
      width: naturalWidth * fitScale,
      height: naturalHeight * fitScale,
    })
  }, [])

  useEffect(() => {
    if (!image) return

    const appShell = document.getElementById("app-shell")
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null

    if (appShell) {
      appShell.inert = true
    }

    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
        return
      }

      if (event.key !== "Tab" || !dialogRef.current) return

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled"))

      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      if (appShell) {
        appShell.inert = false
      }
      previouslyFocusedRef.current?.focus()
    }
  }, [image, onClose])

  useEffect(() => {
    if (!activeAnnotationId) return
    annotationRowRefs.current.get(activeAnnotationId)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [activeAnnotationId])

  useEffect(() => {
    if (!image || !imageStageRef.current) return

    const stage = imageStageRef.current
    const imageElement = stage.querySelector("img")
    const resizeObserver = new ResizeObserver(() => {
      if (imageElement?.naturalWidth && imageElement.naturalHeight) {
        fitImageToStage(imageElement.naturalWidth, imageElement.naturalHeight)
      }
    })

    resizeObserver.observe(stage)
    return () => resizeObserver.disconnect()
  }, [fitImageToStage, image])

  if (!image) return null

  const imageUrl = resolveBackendFileUrl(image.imageUrl)
  const excludedCount = image.annotations.filter((annotation) => excludedAnnotationIds.has(annotation.id)).length
  const annotationsByCategory = (() => {
    const counts = new Map<string, number>()
    return image.annotations.map((annotation) => {
      const number = (counts.get(annotation.category) ?? 0) + 1
      counts.set(annotation.category, number)
      return { annotation, number }
    })
  })()
  const selectedAnnotation = activeAnnotationId
    ? annotationsByCategory.find(({ annotation }) => annotation.id === activeAnnotationId)
    : null

  function selectAnnotation(annotationId: string) {
    setActiveAnnotationId(annotationId)
    setActiveTab("annotations")
  }

  function zoomBy(delta: number) {
    setZoom((current) => Math.min(300, Math.max(50, current + delta)))
  }

  function resetView() {
    setZoom(100)
    setTranslation({ x: 0, y: 0 })
  }

  function focusOnObject(annotationId = activeAnnotationId) {
    const annotationToFocus = annotationId
      ? annotationsByCategory.find(({ annotation }) => annotation.id === annotationId)
      : null

    if (!annotationToFocus || !imageStageRef.current || !imageCanvasRef.current) {
      return
    }

    const { annotation } = annotationToFocus
    const canvasWidth = imageCanvasRef.current.clientWidth
    const canvasHeight = imageCanvasRef.current.clientHeight
    const targetScale = Math.min(
      3,
      Math.max(0.5, 0.38 / Math.max(annotation.width, annotation.height)),
    )

    setShowAnnotations(true)
    setZoom(targetScale * 100)
    setTranslation({
      x: (0.5 - annotation.xCenter) * canvasWidth * targetScale,
      y: (0.5 - annotation.yCenter) * canvasHeight * targetScale,
    })
  }

  return createPortal((
    <>
      <div
        aria-hidden="true"
        className="pointer-events-auto fixed top-0 left-0 z-50 h-screen w-screen bg-black/65 backdrop-blur-[2px]"
        onMouseDown={(event) => {
          event.preventDefault()
          closeButtonRef.current?.focus()
        }}
      />
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="image-detail-title" className="fixed inset-1/2 z-60 flex h-[89vh] w-[92vw] max-w-350 -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-card shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b px-5 py-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Focused annotation review</p>
            <h2 id="image-detail-title" className="truncate text-base font-semibold" title={image.fileName}>{image.fileName}</h2>
          </div>
          <Button ref={closeButtonRef} type="button" variant="ghost" size="icon-sm" aria-label="Close image review workspace" onClick={onClose}><X aria-hidden="true" /></Button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,13fr)_minmax(18rem,7fr)]">
          <main className="flex min-h-0 min-w-0 flex-col border-r bg-muted/20">
            <div ref={imageStageRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-neutral-950/5 p-4">
              {imageUrl ? (
                <div className="flex size-full min-h-0 min-w-0 items-center justify-center overflow-auto">
                  <div ref={imageCanvasRef} className="relative inline-block max-h-full max-w-full origin-center leading-none transition-transform duration-150" style={{ width: fitSize?.width, height: fitSize?.height, transform: `translate3d(${translation.x}px, ${translation.y}px, 0) scale(${zoom / 100})` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt={image.fileName} className="block size-full object-contain" onLoad={(event) => fitImageToStage(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)} />
                    {showAnnotations ? image.annotations.map((annotation) => {
                      const isExcluded = excludedAnnotationIds.has(annotation.id)
                      const isSelected = activeAnnotationId === annotation.id
                      const isHovered = hoveredAnnotationId === annotation.id
                      return (
                        <button
                          key={annotation.id}
                          type="button"
                          aria-label={`${displayCategory(annotation.category)} annotation${isExcluded ? ", excluded" : ""}`}
                          className={`absolute overflow-visible border-2 text-left outline-none transition-[border-color,opacity,box-shadow] focus-visible:ring-2 focus-visible:ring-amber-300 ${isExcluded ? "border-dashed border-amber-500/80 bg-amber-300/10 opacity-65" : "border-emerald-400/90 bg-emerald-300/10"} ${isSelected ? "border-amber-400 bg-amber-300/25 opacity-100 shadow-[0_0_0_2px_rgba(255,255,255,0.9)]" : ""}`}
                          style={{ left: `${(annotation.xCenter - annotation.width / 2) * 100}%`, top: `${(annotation.yCenter - annotation.height / 2) * 100}%`, width: `${annotation.width * 100}%`, height: `${annotation.height * 100}%`, zIndex: isSelected ? 30 : isHovered ? 20 : 10 }}
                          onMouseEnter={() => setHoveredAnnotationId(annotation.id)}
                          onMouseLeave={() => setHoveredAnnotationId(null)}
                          onFocus={() => setHoveredAnnotationId(annotation.id)}
                          onBlur={() => setHoveredAnnotationId(null)}
                          onClick={() => selectAnnotation(annotation.id)}
                          onDoubleClick={() => {
                            selectAnnotation(annotation.id)
                            focusOnObject(annotation.id)
                          }}
                        >
                          {isSelected || isHovered ? <span className={`absolute left-0 top-0 -translate-y-full whitespace-nowrap rounded px-1 py-0.5 text-[10px] font-semibold leading-none ${isExcluded ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>{displayCategory(annotation.category)}{isExcluded ? " · Excluded" : ""}</span> : null}
                        </button>
                      )
                    }) : null}
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground">Image preview unavailable.</p>}
            </div>

            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-card px-4 py-2.5">
              <div className="flex items-center gap-1.5" aria-label="Zoom controls">
                <Button type="button" variant="outline" size="icon-sm" aria-label="Zoom out" onClick={() => zoomBy(-25)} disabled={zoom === 50}><Minus aria-hidden="true" /></Button>
                <span className="min-w-16 text-center text-xs font-semibold tabular-nums">{zoom}%</span>
                <Button type="button" variant="outline" size="icon-sm" aria-label="Zoom in" onClick={() => zoomBy(25)} disabled={zoom === 300}><Plus aria-hidden="true" /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={resetView}><Maximize2 data-icon="inline-start" />100%</Button>
                <Button type="button" variant="ghost" size="sm" onClick={resetView}>Fit to View</Button>
              </div>
              <Button type="button" variant={showAnnotations ? "secondary" : "outline"} size="sm" aria-pressed={showAnnotations} onClick={() => setShowAnnotations((current) => !current)}>
                {showAnnotations ? <EyeOff data-icon="inline-start" /> : <Eye data-icon="inline-start" />}{showAnnotations ? "Hide Annotations" : "Show Annotations"}
              </Button>
            </footer>
          </main>

          <aside className="flex min-h-0 min-w-0 flex-col">
            <nav className="grid shrink-0 grid-cols-3 border-b" aria-label="Image inspector tabs">
              {([["annotations", "Annotations"], ["metadata", "Metadata"], ["txt", "Raw TXT"]] as const).map(([tab, label]) => (
                <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} className={`border-b-2 px-2 py-3 text-xs font-semibold transition-colors ${activeTab === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`} onClick={() => setActiveTab(tab)}>{label}</button>
              ))}
            </nav>

            <div className={`min-h-0 flex-1 p-4 ${activeTab === "annotations" ? "overflow-hidden" : "overflow-y-auto"}`}>
              {activeTab === "annotations" ? (
                <section aria-labelledby="annotations-title" className="flex h-full min-h-0 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 id="annotations-title" className="text-sm font-semibold">Annotations</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{image.annotations.length} annotations · {excludedCount} excluded</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={onRestoreAll} disabled={excludedCount === 0}>Restore All</Button>
                  </div>
                  {selectedAnnotation ? (
                    <div className="mt-3 rounded-lg border border-amber-300/70 bg-amber-50/70 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">Selected Annotation</p>
                          <p className="mt-1 truncate text-sm font-semibold text-amber-950">
                            {displayCategory(selectedAnnotation.annotation.category)} #{selectedAnnotation.number}
                          </p>
                          <p className="mt-1 text-xs text-amber-900/75">
                            BBox: {selectedAnnotation.annotation.width.toFixed(2)} × {selectedAnnotation.annotation.height.toFixed(2)} · Area: {formatArea(selectedAnnotation.annotation.area)}
                          </p>
                          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => focusOnObject()}>
                            Focus on Object
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant={excludedAnnotationIds.has(selectedAnnotation.annotation.id) ? "secondary" : "default"}
                          size="sm"
                          onClick={() => onToggleAnnotation(selectedAnnotation.annotation.id)}
                        >
                          {excludedAnnotationIds.has(selectedAnnotation.annotation.id) ? "Restore Annotation" : "Exclude from Export"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <p className="mt-3 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">Excluded annotations affect only the exported dataset. The original dataset remains unchanged.</p>
                  <div className="mt-4 overflow-hidden rounded-lg border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr><th scope="col" className="px-3 py-2 font-medium">Category</th><th scope="col" className="px-3 py-2 text-right font-medium">Count</th></tr>
                      </thead>
                      <tbody className="divide-y">
                        {image.annotationSummary.map(({ category, count }) => (
                          <tr key={category}><td className="px-3 py-2">{displayCategory(category)}</td><td className="px-3 py-2 text-right font-medium">{count}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-lg border">
                    <div className="divide-y">
                      {annotationsByCategory.map(({ annotation, number }) => {
                        const isExcluded = excludedAnnotationIds.has(annotation.id)
                        const isActive = activeAnnotationId === annotation.id
                        return (
                          <div key={annotation.id} ref={(element) => { if (element) annotationRowRefs.current.set(annotation.id, element); else annotationRowRefs.current.delete(annotation.id) }} className={`flex items-center gap-2 px-3 py-1.5 ${isActive ? "bg-amber-50" : "bg-card"}`} onMouseEnter={() => setHoveredAnnotationId(annotation.id)} onMouseLeave={() => setHoveredAnnotationId(null)}>
                            <button type="button" className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" onFocus={() => setHoveredAnnotationId(annotation.id)} onBlur={() => setHoveredAnnotationId(null)} onClick={() => selectAnnotation(annotation.id)} onDoubleClick={() => { selectAnnotation(annotation.id); focusOnObject(annotation.id) }}>
                              <span className="block truncate text-sm font-medium">{displayCategory(annotation.category)} #{number}</span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">{annotation.width.toFixed(2)} × {annotation.height.toFixed(2)} · area {formatArea(annotation.area)}</span>
                            </button>
                            <span className={`text-xs font-semibold ${isExcluded ? "text-amber-700" : "text-emerald-700"}`}>{isExcluded ? "Excluded" : "Keep"}</span>
                            <Button type="button" variant={isExcluded ? "secondary" : "outline"} size="icon-xs" aria-label={isExcluded ? `Restore ${displayCategory(annotation.category)} #${number}` : `Exclude ${displayCategory(annotation.category)} #${number} from export`} onClick={() => onToggleAnnotation(annotation.id)}>{isExcluded ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}</Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </section>
              ) : null}

              {activeTab === "metadata" ? (
                <section aria-labelledby="image-metadata-title">
                  <h3 id="image-metadata-title" className="mb-3 text-sm font-semibold">Image Metadata</h3>
                  <dl className="divide-y rounded-lg border text-sm">
                    {[["Time of Day", image.metadata.timeOfDay], ["Weather", image.metadata.weather], ["Installation Location", image.metadata.installationLocation], ["Location", image.metadata.location]].map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 px-3 py-2.5"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value ?? "Not provided"}</dd></div>
                    ))}
                    <div className="space-y-2 px-3 py-2.5"><dt className="text-muted-foreground">Additional Tags</dt><dd className="flex flex-wrap gap-1">{image.metadata.tags.map((tag) => <Badge key={tag} variant="secondary" className="font-normal">{tag}</Badge>)}</dd></div>
                  </dl>
                </section>
              ) : null}

              {activeTab === "txt" ? (
                <section aria-labelledby="annotation-file-title">
                  <h3 id="annotation-file-title" className="text-sm font-semibold">Original Annotation File</h3>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{image.annotationFile.fileName}</p>
                  <pre className="mt-4 max-h-[calc(90vh-14rem)] overflow-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-6 whitespace-pre-wrap">{image.annotationFile.content}</pre>
                </section>
              ) : null}
            </div>
          </aside>
        </div>
      </section>
    </>
  ), document.body)
}
