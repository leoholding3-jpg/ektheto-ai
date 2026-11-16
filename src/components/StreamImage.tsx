import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Wifi } from 'lucide-react';
import type { ImageLoadMode } from '../types';
import {
  buildOptimizedMediaUrl,
  fetchCachedImageObjectUrl,
  shouldAutoLoadImages,
} from '../utils/imageCache';

interface StreamImageProps {
  src?: string;
  alt: string;
  width: number;
  height: number;
  imageLoadMode: ImageLoadMode;
  tapToLoadLabel: string;
  liteBadgeLabel: string;
  wifiPausedLabel: string;
  className?: string;
}

export function StreamImage({
  src,
  alt,
  width,
  height,
  imageLoadMode,
  tapToLoadLabel,
  liteBadgeLabel,
  wifiPausedLabel,
  className = '',
}: StreamImageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [manualLoad, setManualLoad] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [litePreviewSrc, setLitePreviewSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Reset per image URL change
  useEffect(() => {
    setManualLoad(false);
    setResolvedSrc(null);
    setLitePreviewSrc(null);
    setFailed(false);
  }, [src]);

  // True viewport lazy loading via IntersectionObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '120px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  const policy = shouldAutoLoadImages(imageLoadMode);
  const shouldFetchFull = Boolean(src && isVisible && (policy.allowed || manualLoad));
  const shouldFetchLitePreview = Boolean(src && isVisible && !shouldFetchFull);

  useEffect(() => {
    if (!src || !shouldFetchFull) return;
    const controller = new AbortController();
    const optimizedUrl = buildOptimizedMediaUrl(src, { width, height, lite: false });

    fetchCachedImageObjectUrl(optimizedUrl, controller.signal)
      .then((objUrl) => {
        if (!controller.signal.aborted) {
          setResolvedSrc(objUrl);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailed(true);
        }
      });

    return () => controller.abort();
  }, [src, width, height, shouldFetchFull]);

  // In Lite/Wi-Fi paused mode, load only ultra-light ~1KB blurred preview if desired
  useEffect(() => {
    if (!src || !shouldFetchLitePreview || litePreviewSrc || failed) return;
    const controller = new AbortController();
    const tinyPreviewUrl = buildOptimizedMediaUrl(src, { width: 36, height: 24, lite: true });

    fetchCachedImageObjectUrl(tinyPreviewUrl, controller.signal)
      .then((objUrl) => {
        if (!controller.signal.aborted) {
          setLitePreviewSrc(objUrl);
        }
      })
      .catch(() => {
        // Keep subtle neutral backdrop silently
      });

    return () => controller.abort();
  }, [src, shouldFetchLitePreview, litePreviewSrc, failed]);

  if (!src || failed) {
    return (
      <div
        ref={containerRef}
        className={`flex h-full w-full items-center justify-center bg-[#F1F5F9] text-[#64748B] dark:bg-slate-800 dark:text-slate-400 ${className}`}
      >
        <ImageIcon className="h-6 w-6" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-[#E2E8F0] dark:bg-slate-800 ${className}`}
    >
      {resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          {litePreviewSrc && (
            <img
              src={litePreviewSrc}
              alt=""
              aria-hidden="true"
              className="h-full w-full scale-105 object-cover blur-sm"
            />
          )}

          {!policy.allowed && !manualLoad && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F172A]/60 p-2 text-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setManualLoad(true);
                }}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] transition-colors hover:bg-[#F1F5F9] dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              >
                {policy.reason === 'wifi_paused' ? (
                  <Wifi className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>{tapToLoadLabel}</span>
              </button>
              <span className="mt-1 text-[11px] font-medium text-white/90">
                {policy.reason === 'wifi_paused' ? wifiPausedLabel : liteBadgeLabel}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
