import { useMemo } from "react";

/**
 * Deterministic star field: the same positions on every render, so the
 * atmosphere never flickers between route changes.
 */
export default function StarField({ count = 70, seed = 7 }) {
  const stars = useMemo(() => {
    let state = seed;
    const next = () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
    return Array.from({ length: count }, (_, index) => ({
      id: index,
      left: `${(next() * 100).toFixed(2)}%`,
      top: `${(next() * 100).toFixed(2)}%`,
      size: `${(0.8 + next() * 2).toFixed(2)}px`,
      opacity: (0.18 + next() * 0.6).toFixed(2),
      delay: `${(next() * 6).toFixed(2)}s`
    }));
  }, [count, seed]);

  return (
    <div className="starfield" aria-hidden="true">
      {stars.map(star => (
        <span
          key={star.id}
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
            animationDelay: star.delay
          }}
        />
      ))}
    </div>
  );
}
