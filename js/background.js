(function () {
  const canvas = document.createElement('canvas');
  canvas.id = 'bg-road';
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.zIndex = '0';
  canvas.style.pointerEvents = 'none';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W, H, horizonY;
  const MINT = '#5ee6a8';
  const AMBER = '#e6b25e';

  // La skyline fixe est stockée en fractions de largeur/hauteur (0..1),
  // donc elle reste correcte quelle que soit la taille de l'écran.
  // Elle reprend maintenant le même style que les anciens immeubles de
  // bord de route : couleur alternée, grille de fenêtres, antenne rouge.
  const NUM_TOWERS = 28;
  const skylineTowers = Array.from({ length: NUM_TOWERS }, (_, i) => ({
    xFrac: i / NUM_TOWERS,
    wFrac: (35 + Math.random() * 50) / 1200,
    hFrac: (60 + Math.random() * 140) / 250,
    color: i % 2 === 0 ? '#0c1017' : '#121722',
    windowTint: i % 3 === 0 ? 'rgba(94, 230, 168, 0.3)' : 'rgba(100, 180, 255, 0.25)',
    hasAntenna: i % 4 === 1
  }));

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    horizonY = H * 0.42;
  }
  window.addEventListener('resize', resize);
  resize();

  const stars = Array.from({ length: 60 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.2 + 0.2,
    a: Math.random() * 0.5 + 0.2
  }));

  const NUM_SECTIONS = 10;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function roadHalfWidth(t) {
    return lerp(W * 0.02, W * 0.62, t);
  }
  function roadY(t) {
    return lerp(horizonY, H, t);
  }

  function drawSky() {
    const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
    grad.addColorStop(0, '#0a0c11');
    grad.addColorStop(1, '#171d2b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, horizonY);

    ctx.fillStyle = '#fff';
    for (const s of stars) {
      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * horizonY, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ville fixe à l'arrière-plan, juste sous l'horizon — même habillage
    // (fenêtres en grille + antenne) que les anciens immeubles de route.
    ctx.strokeStyle = '#1d2638';
    ctx.lineWidth = 0.5;
    for (const tower of skylineTowers) {
      const towerX = tower.xFrac * W;
      const towerW = tower.wFrac * W;
      const towerH = tower.hFrac * horizonY;
      const towerY = horizonY - towerH;

      ctx.fillStyle = tower.color;
      ctx.beginPath();
      ctx.rect(towerX, towerY, towerW, towerH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = tower.windowTint;
      const rows = 10;
      const cols = 4;
      const padX = towerW / (cols + 1);
      const padY = towerH / (rows + 1);
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          if ((r * c) % 3 !== 0) {
            const winX = towerX + c * padX - 1.5;
            const winY = towerY + r * padY - 2;
            ctx.fillRect(winX, winY, 1.5, 2.5);
          }
        }
      }

      if (tower.hasAntenna) {
        ctx.fillStyle = '#ff4a4a';
        ctx.beginPath();
        ctx.arc(towerX + towerW / 2, towerY - 6, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawGround() {
    ctx.fillStyle = '#0d0f14';
    ctx.fillRect(0, horizonY, W, H - horizonY);
  }

  function drawRoad() {
    ctx.beginPath();
    ctx.moveTo(W / 2 - roadHalfWidth(0), roadY(0));
    ctx.lineTo(W / 2 + roadHalfWidth(0), roadY(0));
    ctx.lineTo(W / 2 + roadHalfWidth(1), roadY(1));
    ctx.lineTo(W / 2 - roadHalfWidth(1), roadY(1));
    ctx.closePath();
    ctx.fillStyle = '#191d24';
    ctx.fill();
  }

  function drawEdgeQuad(t0, t1, side, color) {
    const y0 = roadY(t0), y1 = roadY(t1);
    const hw0 = roadHalfWidth(t0), hw1 = roadHalfWidth(t1);
    const outer0 = W / 2 + side * hw0;
    const outer1 = W / 2 + side * hw1;
    const edgeW0 = Math.max(hw0 * 0.04, 1.5);
    const edgeW1 = Math.max(hw1 * 0.04, 1.5);
    const inner0 = outer0 - side * edgeW0;
    const inner1 = outer1 - side * edgeW1;

    ctx.beginPath();
    ctx.moveTo(outer0, y0);
    ctx.lineTo(outer1, y1);
    ctx.lineTo(inner1, y1);
    ctx.lineTo(inner0, y0);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawMarkings(phase) {
    const N = 22;
    for (let i = 0; i < N; i++) {
      const raw = ((i + phase) % N) / N;
      const t = raw * raw;
      const nextRaw = raw + 1 / N;
      const tNext = Math.min(nextRaw * nextRaw, 1);

      const color = i % 2 === 0 ? MINT : '#0d0f14';
      ctx.globalAlpha = 0.55;
      drawEdgeQuad(t, tNext, -1, color);
      drawEdgeQuad(t, tNext, 1, color);
      ctx.globalAlpha = 1;

      if (i % 2 === 0) {
        const y = roadY(t);
        const yNext = roadY(tNext);
        const segH = Math.max(yNext - y, 1);
        const hw = roadHalfWidth(t);
        const dashW = Math.max(hw * 0.03, 1.5);
        ctx.fillStyle = '#e6e9ef';
        ctx.fillRect(W / 2 - dashW / 2, y, dashW, segH);
      }
    }
  }

  function drawLamp(t, side, litPhase) {
    const y = roadY(t);
    const hw = roadHalfWidth(t);
    const scale = lerp(0.18, 2.4, t);
    const x = W / 2 + side * (hw + 15 * scale);
    const poleH = 90 * scale;

    ctx.strokeStyle = 'rgba(230,233,239,0.35)';
    ctx.lineWidth = Math.max(scale * 3, 1.5);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - poleH);
    ctx.stroke();

    const glowOn = litPhase < 0.85;
    ctx.fillStyle = glowOn ? AMBER : 'rgba(230,178,94,0.15)';
    ctx.globalAlpha = glowOn ? 0.9 : 0.3;
    ctx.beginPath();
    ctx.arc(x, y - poleH, Math.max(scale * 9, 1.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawScenery(phase) {
    // Il ne reste plus que les lampadaires le long de la route (les
    // immeubles ont été retirés d'ici — ils vivent uniquement dans la
    // skyline fixe d'arrière-plan, cf. drawSky). On garde le tri par
    // profondeur pour que les lampadaires les plus proches s'affichent
    // toujours par-dessus ceux plus loin.
    const sections = [];
    for (let i = 0; i < NUM_SECTIONS; i++) {
      if (i % 2 !== 0) continue;
      const raw = ((i + phase * 0.7) % NUM_SECTIONS) / NUM_SECTIONS;
      const t = raw * raw;
      const litPhase = (raw * 5) % 1;
      sections.push({ t, litPhase });
    }
    sections.sort((a, b) => a.t - b.t);

    for (const s of sections) {
      drawLamp(s.t, -1, s.litPhase);
      drawLamp(s.t, 1, s.litPhase);
    }
  }

  function drawVignette() {
    const grad = ctx.createRadialGradient(
      W / 2, H * 0.55, H * 0.2,
      W / 2, H * 0.55, H * 0.9
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawHeadlightGlow() {
    const grad = ctx.createRadialGradient(
      W / 2, H, H * 0.05,
      W / 2, H, H * 0.5
    );
    grad.addColorStop(0, 'rgba(94,230,168,0.12)');
    grad.addColorStop(1, 'rgba(94,230,168,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function frame(t) {
    const phase = (t / 700) % 1000;
    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawGround();
    drawRoad();
    drawScenery(phase * 0.35);
    drawMarkings(phase);
    drawHeadlightGlow();
    drawVignette();
    if (!reduceMotion) requestAnimationFrame(frame);
  }

  if (reduceMotion) {
    frame(0);
  } else {
    requestAnimationFrame(frame);
  }
})();
