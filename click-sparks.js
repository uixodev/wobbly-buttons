// Click (mouse) anywhere and a few short, hand-drawn lines flick out from the point, like the marks round a pressed button.
// (Buttons draw their own marks, so clicks on them are skipped.) Cream on dark surfaces, ink elsewhere. Off on touch and with reduced motion.

// Mouse only: touch screens (and reduced motion) never get the marks.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const NS = 'http://www.w3.org/2000/svg';
  const DARK = '.footer-dark, .menu, .panel.pn1, .panel.pn3, .panel.pn5, .vira-logo, .tile-jelly';
  const R = 44;

  const spark = (e) => {
    if (e.button > 0 || e.target.closest?.('.wobbly')) return;
    const dark = !!e.target.closest?.(DARK) || document.documentElement.classList.contains('menu-open');
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `${-R} ${-R} ${R * 2} ${R * 2}`);
    Object.assign(svg.style, { position: 'fixed', left: `${e.clientX - R}px`, top: `${e.clientY - R}px`, width: `${R * 2}px`, height: `${R * 2}px`, pointerEvents: 'none', zIndex: 9998, overflow: 'visible' });
    svg.setAttribute('aria-hidden', 'true');
    const n = 7 + Math.floor(Math.random() * 3), turn = Math.random() * Math.PI;
    for (let i = 0; i < n; i++) {
      const a = turn + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const r1 = 13 + Math.random() * 6, r2 = r1 + 9 + Math.random() * 12, bend = (Math.random() - 0.5) * 5;
      const x1 = Math.cos(a) * r1, y1 = Math.sin(a) * r1, x2 = Math.cos(a) * r2, y2 = Math.sin(a) * r2;
      const mx = (x1 + x2) / 2 - Math.sin(a) * bend, my = (y1 + y2) / 2 + Math.cos(a) * bend;
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`);
      p.setAttribute('pathLength', '1');
      p.setAttribute('fill', 'none'); p.setAttribute('stroke', dark ? '#F7F3EF' : '#111'); p.setAttribute('stroke-width', '1.7'); p.setAttribute('stroke-linecap', 'round');
      p.style.strokeDasharray = '1'; p.style.strokeDashoffset = '1';
      p.animate(
        [{ strokeDashoffset: 1, opacity: 1, transform: 'translate(0,0)' },
         { strokeDashoffset: 0, opacity: 1, transform: `translate(${Math.cos(a) * 3}px, ${Math.sin(a) * 3}px)`, offset: 0.45 },
         { strokeDashoffset: -0.6, opacity: 0, transform: `translate(${Math.cos(a) * 9}px, ${Math.sin(a) * 9}px)` }],
        { duration: 560 + Math.random() * 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
      svg.append(p);
    }
    document.body.append(svg);
    setTimeout(() => svg.remove(), 800);
  };
  addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') spark(e); }, { passive: true });
}
