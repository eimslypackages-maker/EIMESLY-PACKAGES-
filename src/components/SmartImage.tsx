import { useState } from 'react';
import { Package } from 'lucide-react';
import { resolveApiUrl } from '../lib/api';

interface SmartImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  eager?: boolean;
}

export function SmartImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackLabel,
  eager = false,
}: SmartImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className="w-full h-full bg-[#F3EEE6] flex flex-col items-center justify-center p-4 text-center select-none"
        role="img"
        aria-label={alt}
      >
        <Package className="w-8 h-8 text-[#B58B61] mb-2" strokeWidth={1.5} />
        <span className="text-xs font-medium text-[#202020]/70 line-clamp-2 max-w-[180px]">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  const resolvedSrc = src.startsWith('/api/')
    ? resolveApiUrl(src)
    : src.startsWith('/src/assets/') && import.meta.env.BASE_URL !== '/'
      ? `${import.meta.env.BASE_URL.replace(/\/+$/, '')}${src}`
      : src;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
