/**
 * The ambient canvas behind every page.
 *
 * Pastel washes drifting slowly over a near-white base, with a faint grid and
 * a little grain so the large soft gradients don't band on cheap panels.
 * Everything is CSS, so it costs no JavaScript and stops animating under
 * prefers-reduced-motion.
 */

// Tiny tiling SVG of fractal noise, inlined so it costs no extra request
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.42'/%3E%3C/svg%3E\")";

export default function SiteBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-pastel-canvas"
    >
      {/* Periwinkle, high and to the left */}
      <div
        className="absolute -top-[26rem] -left-[16rem] h-[52rem] w-[52rem] rounded-full animate-drift"
        style={{
          background:
            'radial-gradient(circle, rgba(155,175,255,0.6) 0%, rgba(155,175,255,0.24) 45%, transparent 72%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Sky blue, low and to the right, drifting against the lilac */}
      <div
        className="absolute top-[16rem] -right-[20rem] h-[48rem] w-[48rem] rounded-full animate-drift-slow"
        style={{
          background:
            'radial-gradient(circle, rgba(130,196,255,0.72) 0%, rgba(130,196,255,0.28) 45%, transparent 72%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Aqua through the middle of the page */}
      <div
        className="absolute top-[52rem] left-[8%] h-[40rem] w-[40rem] rounded-full animate-drift"
        style={{
          background:
            'radial-gradient(circle, rgba(150,214,245,0.55) 0%, transparent 68%)',
          filter: 'blur(44px)',
        }}
      />

      {/* Teal, far down, so long pages don't run out of colour */}
      <div
        className="absolute bottom-[-18rem] right-[14%] h-[38rem] w-[38rem] rounded-full animate-drift-slow"
        style={{
          background:
            'radial-gradient(circle, rgba(160,226,228,0.5) 0%, transparent 68%)',
          filter: 'blur(44px)',
        }}
      />

      {/* Grid, masked to fade before the edges so it never looks like a table */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(31,32,51,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(31,32,51,0.045) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage:
            'radial-gradient(ellipse 100% 60% at 50% 0%, #000 30%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 100% 60% at 50% 0%, #000 30%, transparent 75%)',
        }}
      />

      {/* Grain, much lighter than on a dark canvas or it reads as dirt */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-multiply"
        style={{ backgroundImage: GRAIN, backgroundRepeat: 'repeat' }}
      />

      {/* A soft white bloom through the middle keeps text areas calm */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(255,255,255,0.7) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
