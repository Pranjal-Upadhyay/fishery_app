'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface LoginHeroProps {
  children: ReactNode;
}

export function LoginHero({ children }: LoginHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Detect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const triggerReveal = () => {
    if (videoEnded) return;
    setVideoEnded(true);

    if (videoRef.current) {
      videoRef.current.pause();
    }

    if (prefersReducedMotion) {
      setShowCard(true);
    } else {
      // Begin card entrance at ~350ms into the background blur transition
      const timer = setTimeout(() => {
        setShowCard(true);
      }, 350);
      return () => clearTimeout(timer);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Fallback safety timeout (7s) in case onEnded doesn't fire or video stutters
    const safetyTimer = setTimeout(() => {
      triggerReveal();
    }, 7000);

    // Attempt autoplay
    video.play().catch(() => {
      // If autoplay is blocked by browser policy, reveal immediately
      triggerReveal();
    });

    return () => clearTimeout(safetyTimer);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-canvas-950 flex items-center justify-center">
      {/* ── Background Video & Blur Layer ── */}
      <div
        className={`fixed inset-0 pointer-events-none transition-all duration-700 ease-out ${
          videoEnded && !prefersReducedMotion
            ? 'scale-[1.05] filter blur-xl'
            : prefersReducedMotion && videoEnded
            ? 'filter blur-md'
            : 'scale-100 filter blur-0'
        }`}
      >
        <video
          ref={videoRef}
          src="/login-bg.mp4"
          poster="/login-bg-poster.jpg"
          preload="auto"
          muted
          playsInline
          onEnded={triggerReveal}
          className="h-full w-full object-cover object-center"
        />
      </div>

      {/* ── Dimming Backdrop Overlay ── */}
      <div
        className={`fixed inset-0 pointer-events-none transition-opacity ${
          prefersReducedMotion ? 'duration-200' : 'duration-700'
        } ${
          videoEnded
            ? 'opacity-100 bg-canvas-950/60 dark:bg-canvas-950/75'
            : 'opacity-0 bg-transparent'
        }`}
      />

      {/* ── Login Card Foreground Layer ── */}
      <div
        className={`relative z-10 w-full max-w-[460px] px-6 py-12 transition-all ${
          prefersReducedMotion ? 'duration-200 ease-out' : 'duration-450'
        } ${
          showCard
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}
        style={{
          transitionTimingFunction:
            showCard && !prefersReducedMotion
              ? 'cubic-bezier(0.34, 1.56, 0.64, 1)'
              : 'ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
