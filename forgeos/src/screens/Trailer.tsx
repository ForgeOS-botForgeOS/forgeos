// #/trailer plays the 30-second trailer on demand: the Download page links
// here, and the link can be shared anywhere. It always plays (no autoplay
// rules), in the calm cut for anyone who asks for reduced motion.
// `?capture=1` is the render-only mode the MP4 export drives.
import { Suspense, lazy, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { parseTrailerFlags } from '../lib/promo/autoplay';
import { DURATION } from '../lib/promo/schedule';
import { CURTAIN, markTrailerSeen, prefersCalm } from '../lib/promo/visit';
import { TrailerBoundary } from '../components/promo/TrailerBoundary';

const PromoTrailer = lazy(() => import('../components/promo/PromoTrailer'));

export default function Trailer() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const flags = useMemo(() => parseTrailerFlags(search, DURATION), [search]);
  const calm = flags.calm || prefersCalm();
  useEffect(() => {
    if (!flags.capture) markTrailerSeen();
  }, [flags.capture]);
  // Back to where they came from (the Download page), or home for a cold link.
  const leave = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/home', { replace: true }));
  return createPortal(
    <TrailerBoundary onFail={leave}>
    <Suspense fallback={<div style={CURTAIN} />}>
      <PromoTrailer
        capture={flags.capture}
        calm={calm}
        startAt={flags.startAt}
        onClose={leave}
        onDownload={() => navigate('/download', { replace: true })}
      />
    </Suspense>
    </TrailerBoundary>,
    document.body,
  );
}
