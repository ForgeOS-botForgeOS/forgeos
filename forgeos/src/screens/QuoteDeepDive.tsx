import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { QUOTES } from '../data/quotes';
import { Card } from '../components/ui';

export default function QuoteDeepDive() {
  const { id } = useParams();
  const navigate = useNavigate();
  const quote = QUOTES.find((q) => q.id === id);

  return (
    <div className="px-4 pt-12 pb-6 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm">
        <ChevronLeft size={16} /> Back
      </button>
      {!quote ? (
        <p className="text-muted">Quote not found.</p>
      ) : (
        <>
          <p className="text-xs uppercase tracking-widest text-accent">{quote.genre} reflection</p>
          <h1 className="text-2xl font-extrabold leading-snug">“{quote.text}”</h1>
          <p className="text-sm text-muted">— {quote.source}</p>
          <Card className="leading-relaxed text-[15px]">{quote.deepDive}</Card>
        </>
      )}
    </div>
  );
}
