'use client';

import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { isAzureBlobUrl } from '@/lib/image-url';

interface CardImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

function hasSignedAccess(url: string): boolean {
  return url.includes('sig=');
}

export function CardImage({ src, alt, className, fallbackClassName }: CardImageProps) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadImage() {
      if (!src) {
        setDisplaySrc(null);
        setFailed(false);
        return;
      }

      // Local paths and pre-signed Azure URLs load directly
      if (!isAzureBlobUrl(src) || hasSignedAccess(src)) {
        setDisplaySrc(src);
        setFailed(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/cards/image/url?url=${encodeURIComponent(src)}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to load image URL');
        }

        const data = await response.json();
        if (!cancelled) {
          setDisplaySrc(data.url);
          setFailed(false);
        }
      } catch {
        if (!cancelled) {
          setDisplaySrc(null);
          setFailed(true);
        }
      }
    }

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src || failed) {
    return (
      <div className={fallbackClassName || className}>
        <CreditCard className="h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  if (!displaySrc) {
    return <div className={`${className} bg-gray-100 animate-pulse`} />;
  }

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
