// Decides, once per page load, whether the trailer plays by itself (rules in
// lib/promo/autoplay.ts, device facts in lib/promo/visit.ts) and mounts it
// over the app if so. Only this file is in the main bundle: the trailer is a
// lazy chunk, never even downloaded inside the Android app or an installed
// web app.
import { lazy, Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CURTAIN, markTrailerSeen, trailerShouldAutoplay } from '../../lib/promo/visit';
import { TrailerBoundary } from './TrailerBoundary';

const PromoTrailer = lazy(() => import('./PromoTrailer'));

export function TrailerGate() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(trailerShouldAutoplay);
  useEffect(() => {
    if (open) markTrailerSeen();
  }, [open]);
  if (!open) return null;
  return createPortal(
    <TrailerBoundary onFail={() => setOpen(false)}>
    <Suspense fallback={<div style={CURTAIN} />}>
      <PromoTrailer
        onClose={() => setOpen(false)}
        onDownload={() => {
          setOpen(false);
          navigate('/download');
        }}
      />
    </Suspense>
    </TrailerBoundary>,
    document.body,
  );
}
