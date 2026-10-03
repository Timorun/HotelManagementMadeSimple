import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BedDouble, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

const SWIPE_THRESHOLD_PX = 40;

// Shared touch handling: a horizontal swipe moves to the previous/next photo.
function useSwipe(onPrevious, onNext) {
  const startX = useRef(null);
  return {
    onTouchStart: (event) => {
      startX.current = event.touches[0].clientX;
    },
    onTouchEnd: (event) => {
      if (startX.current === null) {
        return;
      }
      const deltaX = event.changedTouches[0].clientX - startX.current;
      startX.current = null;
      if (deltaX > SWIPE_THRESHOLD_PX) {
        onPrevious();
      } else if (deltaX < -SWIPE_THRESHOLD_PX) {
        onNext();
      }
    },
  };
}

/**
 * Photo carousel for a suite card: arrows, swipe and a counter. Clicking the photo opens
 * a full-screen lightbox.
 */
export default function PhotoGallery({ photos = [], alt }) {
  const { tr } = useI18n();
  const [index, setIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const count = photos.length;
  const shown = index < count ? index : 0;

  const previous = () => setIndex((current) => (current - 1 + count) % count);
  const next = () => setIndex((current) => (current + 1) % count);
  const swipe = useSwipe(previous, next);

  if (count === 0) {
    return (
      <div className="photo-gallery empty" aria-hidden="true">
        <BedDouble size={40} />
      </div>
    );
  }

  return (
    <>
      <div className="photo-gallery" {...swipe}>
        <button
          type="button"
          className="photo-gallery-image"
          onClick={() => setLightboxIndex(shown)}
          aria-label={tr(`Open photos of ${alt}`, `Abrir fotos de ${alt}`)}
        >
          <img src={photos[shown]} alt={`${alt} (${shown + 1}/${count})`} loading={shown === 0 ? 'eager' : 'lazy'} />
        </button>
        {count > 1 && (
          <>
            <button type="button" className="photo-gallery-arrow left" onClick={previous} aria-label={tr('Previous photo', 'Foto anterior')}>
              <ChevronLeft size={20} />
            </button>
            <button type="button" className="photo-gallery-arrow right" onClick={next} aria-label={tr('Next photo', 'Foto siguiente')}>
              <ChevronRight size={20} />
            </button>
            <span className="photo-gallery-counter">{shown + 1} / {count}</span>
          </>
        )}
      </div>
      {/* Outside the carousel, so swipes in the lightbox don't also move the carousel */}
      {lightboxIndex !== null && (
        <Lightbox photos={photos} startIndex={lightboxIndex} alt={alt} onClose={() => setLightboxIndex(null)} />
      )}
    </>
  );
}

/** Full-screen photo viewer: arrow keys, swipe, Esc to close. */
export function Lightbox({ photos, startIndex = 0, alt, onClose }) {
  const { tr } = useI18n();
  const [index, setIndex] = useState(startIndex);
  const closeButton = useRef(null);
  const count = photos.length;
  const previous = () => setIndex((current) => (current - 1 + count) % count);
  const next = () => setIndex((current) => (current + 1) % count);
  const swipe = useSwipe(previous, next);

  useEffect(() => {
    closeButton.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') setIndex((current) => (current - 1 + count) % count);
      if (event.key === 'ArrowRight') setIndex((current) => (current + 1) % count);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [count, onClose]);

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={onClose} {...swipe}>
      <button type="button" className="lightbox-close" ref={closeButton} onClick={onClose} aria-label={tr('Close', 'Cerrar')}>
        <X size={26} />
      </button>
      <img src={photos[index]} alt={`${alt} (${index + 1}/${count})`} onClick={(event) => event.stopPropagation()} />
      {count > 1 && (
        <>
          <button
            type="button"
            className="lightbox-arrow left"
            onClick={(event) => { event.stopPropagation(); previous(); }}
            aria-label={tr('Previous photo', 'Foto anterior')}
          >
            <ChevronLeft size={32} />
          </button>
          <button
            type="button"
            className="lightbox-arrow right"
            onClick={(event) => { event.stopPropagation(); next(); }}
            aria-label={tr('Next photo', 'Foto siguiente')}
          >
            <ChevronRight size={32} />
          </button>
          <span className="lightbox-counter">{index + 1} / {count}</span>
        </>
      )}
    </div>,
    document.body,
  );
}
