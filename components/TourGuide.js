import { useCallback, useEffect, useRef, useState } from 'react';

const MARGIN = 16;

// A lightweight, dependency-free guided-tour: spotlights one element at a
// time (dims everything else), shows a tooltip with Next/Skip, and only
// auto-starts once per browser (tracked in localStorage) per tourId.
export default function TourGuide({ tourId, steps, autoStart = true }) {
  const storageKey = `morango_tour_seen_${tourId}`;
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: MARGIN, left: MARGIN });
  const tooltipRef = useRef(null);

  const computeRect = useCallback(() => {
    const step = steps[stepIndex];
    if (!step) {
      finish();
      return;
    }
    const el = document.querySelector(step.selector);
    if (!el) {
      // This step's target isn't on the page right now (e.g. an empty-state
      // is showing instead of data). Skip forward instead of getting stuck
      // invisible — and properly finish (marking it "seen") if it was the
      // last step, so the tour doesn't keep re-triggering on every reload.
      if (stepIndex >= steps.length - 1) {
        finish();
      } else {
        setStepIndex((i) => i + 1);
      }
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // scrollIntoView is async-ish; measure on next frame so the rect is settled
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    });
  }, [stepIndex, steps]);

  useEffect(() => {
    if (typeof window === 'undefined' || !autoStart) return;
    const seen = window.localStorage.getItem(storageKey);
    if (!seen && steps && steps.length > 0) {
      const t = setTimeout(() => setActive(true), 450); // let the page settle first
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) return;
    computeRect();
    window.addEventListener('resize', computeRect);
    window.addEventListener('scroll', computeRect, true);
    return () => {
      window.removeEventListener('resize', computeRect);
      window.removeEventListener('scroll', computeRect, true);
    };
  }, [active, computeRect]);

  // After the spotlight rect changes, measure the ACTUAL tooltip size and clamp
  // its position so it always stays fully inside the viewport — regardless of
  // how tall/large the highlighted element is or where on the page it sits.
  useEffect(() => {
    if (!active || !rect) return;
    const el = tooltipRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tw = el ? el.offsetWidth : 320;
    const th = el ? el.offsetHeight : 140;

    const spaceBelow = vh - (rect.top + rect.height);
    const spaceAbove = rect.top;
    let top;
    if (spaceBelow >= th + MARGIN || spaceBelow >= spaceAbove) {
      top = rect.top + rect.height + MARGIN;
    } else {
      top = rect.top - th - MARGIN;
    }
    // Hard clamp: never let the tooltip render outside the viewport.
    top = Math.min(Math.max(top, MARGIN), Math.max(MARGIN, vh - th - MARGIN));
    let left = rect.left;
    left = Math.min(Math.max(left, MARGIN), Math.max(MARGIN, vw - tw - MARGIN));

    setTooltipPos({ top, left });
    // Re-measure once more after paint in case content wrapped and changed height.
    const raf = requestAnimationFrame(() => {
      if (!tooltipRef.current) return;
      const th2 = tooltipRef.current.offsetHeight;
      if (Math.abs(th2 - th) > 4) {
        let top2 = spaceBelow >= th2 + MARGIN || spaceBelow >= spaceAbove
          ? rect.top + rect.height + MARGIN
          : rect.top - th2 - MARGIN;
        top2 = Math.min(Math.max(top2, MARGIN), Math.max(MARGIN, vh - th2 - MARGIN));
        setTooltipPos((p) => ({ ...p, top: top2 }));
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [active, rect, stepIndex]);

  // Expose a manual restart hook so a page-level "Help" button can retrigger it.
  useEffect(() => {
    window[`__restartTour_${tourId}`] = () => {
      window.localStorage.removeItem(storageKey);
      setStepIndex(0);
      setActive(true);
    };
    return () => {
      delete window[`__restartTour_${tourId}`];
    };
  }, [tourId, storageKey]);

  function finish() {
    window.localStorage.setItem(storageKey, '1');
    setActive(false);
    setStepIndex(0);
  }

  function next() {
    if (stepIndex >= steps.length - 1) {
      finish();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  if (!active || !steps || steps.length === 0) return null;
  const step = steps[stepIndex];
  if (!rect) return null;

  return (
    <div className="tour-root">
      <div
        className="tour-spotlight"
        style={{ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 }}
      />
      <div
        ref={tooltipRef}
        className="tour-tooltip"
        style={{ top: tooltipPos.top, left: tooltipPos.left, width: 320 }}
      >
        <div className="tour-step-count">Step {stepIndex + 1} of {steps.length}</div>
        <div className="tour-title">{step.title}</div>
        <div className="tour-desc">{step.description}</div>
        <div className="tour-actions">
          <button className="btn btn-sm" onClick={finish}>Skip tour</button>
          <button className="btn btn-primary btn-sm" onClick={next}>
            {stepIndex >= steps.length - 1 ? 'Done' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
