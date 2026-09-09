"use client";

import { useEffect, useRef, useState } from "react";

import { Progress } from "@/components/ui/progress";

const stages = [
  "Uploading files",
  "Validating file structure",
  "Processing images",
  "Processing annotation files",
  "Loading metadata",
  "Creating dataset records",
] as const;

export function UploadProgress({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStep((currentStep) => {
        const nextStep = currentStep + 1;
        if (nextStep >= stages.length) {
          window.clearInterval(timer);
          onCompleteRef.current();
          return stages.length;
        }
        return nextStep;
      });
    }, 650);

    return () => window.clearInterval(timer);
  }, []);

  const progress = Math.min(Math.round((step / stages.length) * 100), 100);
  const processedImages = Math.min(7_240, Math.round((progress / 100) * 7_240));
  const processedAnnotations = Math.min(
    7_240,
    Math.round((progress / 100) * 7_240),
  );

  return (
    <section className="space-y-5" aria-labelledby="upload-progress-title">
      <div>
        <h2 id="upload-progress-title" className="text-base font-semibold">
          Uploading Dataset
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Processing the prepared dataset in a mock upload flow.
        </p>
      </div>
      <div className="space-y-2">
        <Progress value={progress} aria-label={`Upload progress: ${progress}%`} />
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{stages[Math.min(step, stages.length - 1)]}</span>
          <span>{progress}%</span>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border bg-card px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Images processed</p>
          <p className="mt-1 text-sm font-semibold">{processedImages.toLocaleString()} / 12,450</p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Annotation files processed</p>
          <p className="mt-1 text-sm font-semibold">{processedAnnotations.toLocaleString()} / 12,450</p>
        </div>
      </div>
      <p className="rounded-lg border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
        The original dataset will remain unchanged.
      </p>
    </section>
  );
}
