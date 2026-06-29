'use client';

import { useEffect, useState } from 'react';
import { Waves } from 'lucide-react';
import { useLoginHero } from './login-hero';

const TITLE_FULL = 'MatsyaMitra';
const SUBTITLE_FULL = 'ADMIN OVERSIGHT';

export function TypewriterBrand() {
  const { showCard, prefersReducedMotion } = useLoginHero();
  const [typedTitle, setTypedTitle] = useState('');
  const [typedSubtitle, setTypedSubtitle] = useState('');
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!showCard) return;

    if (prefersReducedMotion) {
      setTypedTitle(TITLE_FULL);
      setTypedSubtitle(SUBTITLE_FULL);
      setIsDone(true);
      return;
    }

    let titleIdx = 0;
    let subtitleIdx = 0;
    let titleTimer: NodeJS.Timeout;
    let subtitleTimer: NodeJS.Timeout;

    const typeTitle = () => {
      if (titleIdx <= TITLE_FULL.length) {
        setTypedTitle(TITLE_FULL.slice(0, titleIdx));
        titleIdx++;
        titleTimer = setTimeout(typeTitle, 50);
      } else {
        // Start typing subtitle
        typeSubtitle();
      }
    };

    const typeSubtitle = () => {
      if (subtitleIdx <= SUBTITLE_FULL.length) {
        setTypedSubtitle(SUBTITLE_FULL.slice(0, subtitleIdx));
        subtitleIdx++;
        subtitleTimer = setTimeout(typeSubtitle, 40);
      } else {
        setIsDone(true);
      }
    };

    // Delay start slightly to align with card spring reveal
    const startDelay = setTimeout(typeTitle, 150);

    return () => {
      clearTimeout(startDelay);
      clearTimeout(titleTimer);
      clearTimeout(subtitleTimer);
    };
  }, [showCard, prefersReducedMotion]);

  return (
    <div className="mb-10 flex items-center gap-4">
      <span className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-teal-400/50 bg-teal-500/20 text-teal-300 shadow-glow flex-shrink-0">
        <Waves className="h-7 w-7 animate-pulse" />
      </span>
      <div>
        <div className="text-3xl sm:text-4xl font-extrabold leading-none text-ink-primary tracking-tight flex items-center min-h-[40px]">
          <span>{typedTitle}</span>
          {!isDone && typedSubtitle.length === 0 && (
            <span className="inline-block w-2.5 h-7 bg-teal-400 ml-1 animate-pulse" />
          )}
        </div>
        <div className="mt-2 text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-teal-400 flex items-center min-h-[20px]">
          <span>{typedSubtitle}</span>
          {!isDone && typedSubtitle.length > 0 && (
            <span className="inline-block w-2 h-4 bg-teal-400 ml-1 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
