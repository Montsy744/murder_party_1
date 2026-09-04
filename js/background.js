 (() => {
        "use strict";

        /* =====================================================================
     PARAMÈTRES — à ajuster librement
  ===================================================================== */
        const TARGET_WIDTH = 2200; // résolution interne visée (plus BAS = pixels plus GROS/rétro)
        const SPEED = 2.2; // vitesse de défilement de la route
        const HORIZON_RATIO = 0.49; // hauteur de la ligne d'horizon (fraction de H)
        const NUM_TREES_NEAR = 146; // sapins de la première rangée, près de la route
        const NUM_TREES_FAR = 1900; // sapins de fond, pour une forêt bien dense
        const SEG_LEN = 1.0; // longueur d'un "segment" de route (bandes asphalte)
        const K_DEPTH = 3.2; // constante de profondeur (perspective des bandes/rumble strips)
        let PIXEL_SCALE = 6; // recalculé dans resize() selon la largeur d'écran

        const canvas = document.getElementById("night-drive-bg");
        const ctx = canvas.getContext("2d", { alpha: false });
        ctx.imageSmoothingEnabled = false;

        let W = 0,
          H = 0,
          horizonY = 0,
          centerX = 0;
        let scrollOffset = 0;
        let lastTime = 0;
        let stars = [];
        let trees = [];

        /* =====================================================================
     DIMENSIONNEMENT — résolution interne basse (pixel art), CSS en plein écran
  ===================================================================== */
        function resize() {
          PIXEL_SCALE = Math.max(
            2,
            Math.round(window.innerWidth / TARGET_WIDTH),
          );
          W = Math.max(64, Math.floor(window.innerWidth / PIXEL_SCALE));
          H = Math.max(48, Math.floor(window.innerHeight / PIXEL_SCALE));
          canvas.width = W;
          canvas.height = H;
          horizonY = Math.floor(H * HORIZON_RATIO);
          centerX = W / 2;
          ctx.imageSmoothingEnabled = false;
          initStars();
          initTrees();
        }

        function initStars() {
          stars = [];
          const count = Math.floor((W * horizonY) / 90);
          for (let i = 0; i < count; i++) {
            stars.push({
              x: Math.random() * W,
              y: Math.random() * horizonY * 0.92,
              phase: Math.random() * Math.PI * 2,
              speed: 0.5 + Math.random() * 1.5,
              bright: Math.random() < 0.15,
            });
          }
        }

        /* =====================================================================
     SAPINS — recyclés à l'infini le long de la route
  ===================================================================== */
        function makeTree(spawnFar, band) {
          // band "near"  : première rangée, collée à la route, arbres plus gros
          // band "far"   : masse de fond, beaucoup plus dense et étalée, arbres plus petits
          const isNear = band === "near";
          return {
            // "z" est une profondeur monde ; on soustrait scrollOffset pour obtenir
            // la profondeur effective. Quand elle passe sous zNear, on recycle.
            z:
              scrollOffset +
              (spawnFar ? 14 + Math.random() * 46 : Math.random() * 60),
            side: Math.random() < 0.5 ? -1 : 1,
            band,
            variant: Math.floor(Math.random() * TREE_VARIANTS),
            lateral: isNear
              ? 0.04 + Math.random() * 0.22
              : 0.22 + Math.random() * 1.6,
            scaleJitter: isNear
              ? 0.85 + Math.random() * 0.5
              : 0.45 + Math.random() * 0.55,
            hueJitter: Math.random(),
          };
        }

        function initTrees() {
          trees = [];
          for (let i = 0; i < NUM_TREES_NEAR; i++)
            trees.push(makeTree(true, "near"));
          for (let i = 0; i < NUM_TREES_FAR; i++)
            trees.push(makeTree(true, "far"));
        }

        /* =====================================================================
     UTILS
  ===================================================================== */
        function lerpColor(c1, c2, t) {
          const a = hexToRgb(c1),
            b = hexToRgb(c2);
          const r = Math.round(a[0] + (b[0] - a[0]) * t);
          const g = Math.round(a[1] + (b[1] - a[1]) * t);
          const bl = Math.round(a[2] + (b[2] - a[2]) * t);
          return `rgb(${r},${g},${bl})`;
        }
        function hexToRgb(hex) {
          const v = parseInt(hex.slice(1), 16);
          return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
        }

        /* =====================================================================
     CIEL, LUNE, ÉTOILES, SILHOUETTE DE FORÊT LOINTAINE
  ===================================================================== */
        function drawSky(time) {
          const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
          grad.addColorStop(0, "#04050c");
          grad.addColorStop(0.6, "#0a0e24");
          grad.addColorStop(1, "#1b2246");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, W, horizonY);

          // lune
          const moonX = W * 0.78,
            moonY = horizonY * 0.28,
            moonR = Math.max(3, H * 0.035);
          const glow = ctx.createRadialGradient(
            moonX,
            moonY,
            0,
            moonX,
            moonY,
            moonR * 5,
          );
          glow.addColorStop(0, "rgba(240,236,200,0.35)");
          glow.addColorStop(1, "rgba(240,236,200,0)");
          ctx.fillStyle = glow;
          ctx.fillRect(
            moonX - moonR * 5,
            moonY - moonR * 5,
            moonR * 10,
            moonR * 10,
          );
          ctx.fillStyle = "#f2eecb";
          ctx.beginPath();
          ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
          ctx.fill();

          // étoiles
          for (const s of stars) {
            const tw = 0.55 + 0.45 * Math.sin(time * 0.001 * s.speed + s.phase);
            ctx.globalAlpha = s.bright ? tw : tw * 0.5;
            ctx.fillStyle = s.bright ? "#fff8e0" : "#c9d6ff";
            ctx.fillRect(Math.floor(s.x), Math.floor(s.y), 1, 1);
          }
          ctx.globalAlpha = 1;

          // silhouette de sapins lointains (ligne d'horizon irrégulière)
          ctx.fillStyle = "#050b08";
          ctx.beginPath();
          ctx.moveTo(0, horizonY);
          const teeth = 26;
          for (let i = 0; i <= teeth; i++) {
            const x = (W / teeth) * i;
            const jitter = (Math.sin(i * 12.9898) * 43758.5453) % 1;
            const h = horizonY - (2 + Math.abs(jitter) * horizonY * 0.22);
            ctx.lineTo(x, h);
            ctx.lineTo(x + W / teeth / 2, horizonY - 1);
          }
          ctx.lineTo(W, horizonY);
          ctx.closePath();
          ctx.fill();
        }

        /* =====================================================================
     ROUTE — technique pseudo-3D par balayage de lignes horizontales
  ===================================================================== */
        const ROAD_A = "#2a2a32",
          ROAD_B = "#232329";
        const RUMBLE_A = "#c94b3f",
          RUMBLE_B = "#d9d4c2";
        const GRASS_A = "#060f08",
          GRASS_B = "#081208";
        const LINE_COLOR = "#d9d4c2";

        function drawRoad() {
          for (let y = horizonY; y < H; y++) {
            const t = (y - horizonY) / (H - horizonY); // 0 à l'horizon, 1 au plus près
            if (t <= 0.002) continue;

            const roadHalfWidth = t * t * (W * 0.62);
            const rumbleW = Math.max(1, roadHalfWidth * 0.08);
            const leftEdge = centerX - roadHalfWidth;
            const rightEdge = centerX + roadHalfWidth;

            // profondeur monde -> index de segment (bandes qui défilent vers la caméra)
            const z = K_DEPTH / t;
            const segIndex = Math.floor((z + scrollOffset) / SEG_LEN);
            const alt = segIndex % 2 === 0;

            // bas-côtés (forêt / talus)
            ctx.fillStyle = alt ? GRASS_A : GRASS_B;
            ctx.fillRect(0, y, Math.max(0, leftEdge), 1);
            ctx.fillRect(rightEdge, y, Math.max(0, W - rightEdge), 1);

            // chaussée
            ctx.fillStyle = alt ? ROAD_A : ROAD_B;
            ctx.fillRect(leftEdge, y, roadHalfWidth * 2, 1);

            // rumble strips (bandes rouges/blanches)
            ctx.fillStyle = alt ? RUMBLE_A : RUMBLE_B;
            ctx.fillRect(leftEdge, y, rumbleW, 1);
            ctx.fillRect(rightEdge - rumbleW, y, rumbleW, 1);

            // ligne centrale discontinue
            if (t > 0.05) {
              const dashIndex = Math.floor((z + scrollOffset) / (SEG_LEN * 2));
              if (dashIndex % 2 === 0) {
                const lineW = Math.max(1, roadHalfWidth * 0.045);
                ctx.fillStyle = LINE_COLOR;
                ctx.fillRect(centerX - lineW / 2, y, lineW, 1);
              }
            }
          }
        }

        /* =====================================================================
     SAPINS — vrais sprites pixel art (dessinés une fois en mémoire, puis
     "tamponnés" à la taille voulue avec drawImage, sans lissage : chaque
     pixel du sprite reste un vrai carré net, comme une image pixel art).
  ===================================================================== */
        const TREE_VARIANTS = 4;
        const SPRITE_W = 22,
          SPRITE_H = 34;

        // types de cellule dans la grille du sprite
        const T_EMPTY = 0,
          T_BASE = 1,
          T_HILITE = 2,
          T_SPECKLE = 3,
          T_TRUNK = 4,
          T_TRUNK_HI = 5;

        const PALETTE_DARK = {
          [T_BASE]: "#123a1e",
          [T_HILITE]: "#1f5c34",
          [T_SPECKLE]: "#0d2c17",
          [T_TRUNK]: "#2a1710",
          [T_TRUNK_HI]: "#3d2313",
        };
        const PALETTE_LIT = {
          [T_BASE]: "#2f7d46",
          [T_HILITE]: "#8fd66b",
          [T_SPECKLE]: "#4a9c5c",
          [T_TRUNK]: "#5c3a20",
          [T_TRUNK_HI]: "#8a5a2e",
        };

        function buildTreeGrid() {
          const grid = Array.from({ length: SPRITE_H }, () =>
            new Array(SPRITE_W).fill(T_EMPTY),
          );
          const cx = Math.floor(SPRITE_W / 2);

          // tronc, visible sous le feuillage et dans les interstices
          const trunkH = 7;
          for (let y = SPRITE_H - trunkH; y < SPRITE_H; y++) {
            for (let x = cx - 1; x <= cx + 1; x++) {
              grid[y][x] = x === cx + 1 ? T_TRUNK_HI : T_TRUNK;
            }
          }

          // étages de feuillage, du plus large (bas) au plus étroit (pointe)
          const tiers = [
            { top: SPRITE_H - 18, height: 13, halfW: 10, taper: 0.55 },
            { top: SPRITE_H - 25, height: 10, halfW: 8, taper: 0.32 },
            { top: SPRITE_H - 31, height: 9, halfW: 6, taper: 0.22 },
            { top: 0, height: 8, halfW: 4, taper: 0.12 },
          ];

          tiers.forEach((tier, tierIdx) => {
            for (let row = 0; row < tier.height; row++) {
              const y = tier.top + row;
              if (y < 0 || y >= SPRITE_H) continue;
              const p = row / tier.height;
              let rowHalfW = tier.halfW * (tier.taper + (1 - tier.taper) * p);
              rowHalfW = Math.max(
                1,
                Math.round(rowHalfW + (Math.random() * 1.4 - 0.7)),
              );

              for (let x = cx - rowHalfW; x <= cx + rowHalfW; x++) {
                if (x < 0 || x >= SPRITE_W) continue;
                const relX = (x - cx) / (rowHalfW || 1);
                let type = T_BASE;
                if (relX > 0.1 && Math.random() < 0.55) type = T_HILITE;
                else if (Math.random() < 0.12) type = T_SPECKLE;
                // petites fenêtres transparentes = lumière qui passe entre les branches
                if (tierIdx > 0 && Math.random() < 0.06) type = T_EMPTY;
                grid[y][x] = type;
              }
            }
          });

          return grid;
        }

        function renderSpriteFromGrid(grid, palette) {
          const off = document.createElement("canvas");
          off.width = SPRITE_W;
          off.height = SPRITE_H;
          const octx = off.getContext("2d");
          octx.imageSmoothingEnabled = false;
          for (let y = 0; y < SPRITE_H; y++) {
            for (let x = 0; x < SPRITE_W; x++) {
              const type = grid[y][x];
              if (type === T_EMPTY) continue;
              octx.fillStyle = palette[type];
              octx.fillRect(x, y, 1, 1);
            }
          }
          return off;
        }

        const treeGrids = Array.from({ length: TREE_VARIANTS }, () =>
          buildTreeGrid(),
        );
        const darkSprites = treeGrids.map((g) =>
          renderSpriteFromGrid(g, PALETTE_DARK),
        );
        const litSprites = treeGrids.map((g) =>
          renderSpriteFromGrid(g, PALETTE_LIT),
        );

        function drawTrees() {
          const withT = [];
          for (const tr of trees) {
            const effZ = tr.z - scrollOffset;
            if (effZ < 0.55) {
              // passé la caméra : on le recycle loin devant, dans sa bande d'origine
              Object.assign(tr, makeTree(true, tr.band));
              continue;
            }
            const t = K_DEPTH / effZ;
            if (t > 1.15 || t < 0.015) continue; // hors champ (trop proche ou trop loin)
            withT.push({ tr, t: Math.min(t, 1) });
          }
          withT.sort((a, b) => a.t - b.t); // du plus loin au plus proche

          for (const { tr, t } of withT) {
            const y = horizonY + t * (H - horizonY);
            const roadHalfWidth = t * t * (W * 0.62);
            const spread = tr.band === "far" ? W * 1.05 : W * 0.9;
            const lateralGap = tr.lateral * t * spread;
            const x =
              centerX +
              tr.side * (roadHalfWidth + lateralGap * (0.3 + t * 0.7));
            if (x < -W * 0.25 || x > W * 1.25) continue; // vraiment hors champ, inutile de dessiner

            const sizeBase = tr.band === "far" ? H * 1.05 : H * 1.55;
            const dh = (2 + t * t * sizeBase) * tr.scaleJitter;
            const dw = dh * (SPRITE_W / SPRITE_H);
            const dx = x - dw / 2;
            const dy = y - dh;

            const distFromCenter = Math.abs(x - centerX) / (W * 0.5);
            let lit =
              Math.max(0, (t - 0.45) / 0.55) *
              Math.max(0, 1 - distFromCenter * 1.4);
            if (tr.band === "far") lit *= 0.5; // le fond reste plus sombre, pour la profondeur
            lit = Math.min(1, lit);

            ctx.drawImage(darkSprites[tr.variant], dx, dy, dw, dh);
            if (lit > 0.03) {
              ctx.globalAlpha = lit;
              ctx.drawImage(litSprites[tr.variant], dx, dy, dw, dh);
              ctx.globalAlpha = 1;
            }
          }
        }

        /* =====================================================================
     PHARES — halo + faisceaux additifs
  ===================================================================== */
        function drawHeadlights() {
          ctx.globalCompositeOperation = "lighter";

          const carY = H * 0.985;
          const beamTargetY = horizonY + (H - horizonY) * 0.18;
          const headOffsets = [-W * 0.11, W * 0.11];

          for (const off of headOffsets) {
            const originX = centerX + off;
            const grad = ctx.createLinearGradient(
              originX,
              carY,
              centerX,
              beamTargetY,
            );
            grad.addColorStop(0, "rgba(255,247,214,0.30)");
            grad.addColorStop(0.35, "rgba(255,247,214,0.14)");
            grad.addColorStop(1, "rgba(255,247,214,0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(originX - W * 0.05, carY);
            ctx.lineTo(originX + W * 0.05, carY);
            ctx.lineTo(centerX + off * 0.15 + W * 0.22, beamTargetY);
            ctx.lineTo(centerX + off * 0.15 - W * 0.22, beamTargetY);
            ctx.closePath();
            ctx.fill();
          }

          // halo chaud proche du capot
          const glow = ctx.createRadialGradient(
            centerX,
            carY,
            0,
            centerX,
            carY,
            W * 0.55,
          );
          glow.addColorStop(0, "rgba(255,244,200,0.22)");
          glow.addColorStop(1, "rgba(255,244,200,0)");
          ctx.fillStyle = glow;
          ctx.fillRect(0, horizonY, W, H - horizonY);

          ctx.globalCompositeOperation = "source-over";
        }

        function drawVignette() {
          const g = ctx.createRadialGradient(
            centerX,
            H * 0.55,
            H * 0.25,
            centerX,
            H * 0.55,
            H * 0.95,
          );
          g.addColorStop(0, "rgba(0,0,0,0)");
          g.addColorStop(1, "rgba(0,0,0,0.55)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, W, H);
        }

        /* =====================================================================
     HABITACLE — dessiné fixe par-dessus la scène (point de vue conducteur)
  ===================================================================== */
        function drawCarInterior() {
          const dashH = H * 0.22;
          const pillarW = W * 0;

          // montants de pare-brise (bandes fines, pas des triangles)
          ctx.fillStyle = "#050505";
          ctx.fillRect(0, 0, pillarW, H * 0.6);
          ctx.fillRect(W - pillarW, 0, pillarW, H * 0.6);
          const dashTopY = H - dashH;

          // bandeau de toit
          ctx.fillStyle = "#060606";
          ctx.fillRect(0, 0, W, H * 0.035);

          // rétroviseur intérieur
          ctx.fillStyle = "#0a0a0a";
          ctx.fillRect(centerX - W * 0.012, H * 0.035, W * 0.024, H * 0.05);
          ctx.fillRect(centerX - W * 0.07, H * 0.08, W * 0.14, H * 0.025);

          // tableau de bord
          const grad = ctx.createLinearGradient(0, dashTopY, 0, H);
          grad.addColorStop(0, "#0d0d0d");
          grad.addColorStop(1, "#020202");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(0, H);
          ctx.lineTo(0, dashTopY + dashH * 0.4);
          ctx.quadraticCurveTo(
            centerX,
            dashTopY - dashH * 0.15,
            W,
            dashTopY + dashH * 0.4,
          );
          ctx.lineTo(W, H);
          ctx.closePath();
          ctx.fill();

          // petites lumières du tableau de bord
          for (const dx of [-0.22, 0.22]) {
            const gx = centerX + W * dx;
            const gy = H - dashH * 0.4;
            const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, W * 0.025);
            glow.addColorStop(0, "rgba(120,255,170,0.55)");
            glow.addColorStop(1, "rgba(120,255,170,0)");
            ctx.fillStyle = glow;
            ctx.fillRect(gx - W * 0.025, gy - W * 0.025, W * 0.05, W * 0.05);
          }

          // volant
          const wheelY = H + H * 0.03;
          const wheelR = W * 0.16;
          ctx.strokeStyle = "#1c1c1c";
          ctx.lineWidth = Math.max(2, W * 0.02);
          ctx.beginPath();
          ctx.arc(centerX, wheelY, wheelR, Math.PI, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#111";
          ctx.beginPath();
          ctx.arc(centerX, wheelY, wheelR * 0.16, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#161616";
          ctx.lineWidth = Math.max(1, W * 0.012);
          ctx.beginPath();
          ctx.moveTo(centerX, wheelY - wheelR * 0.16);
          ctx.lineTo(centerX, wheelY - wheelR);
          ctx.moveTo(centerX, wheelY);
          ctx.lineTo(centerX - wheelR * 0.95, wheelY - wheelR * 0.25);
          ctx.moveTo(centerX, wheelY);
          ctx.lineTo(centerX + wheelR * 0.95, wheelY - wheelR * 0.25);
          ctx.stroke();
        }

        /* =====================================================================
     BOUCLE PRINCIPALE
  ===================================================================== */
        function frame(time) {
          requestAnimationFrame(frame);
          const dt = Math.min(0.05, (time - lastTime) / 1000 || 0);
          lastTime = time;

          scrollOffset += SPEED * dt;

          // très léger tangage pour simuler la suspension (n'affecte pas l'habitacle)
          const bob =
            Math.sin(time * 0.0016) * 0.6 + Math.sin(time * 0.0031) * 0.3;
          ctx.save();
          ctx.translate(0, bob);

          drawSky(time);
          drawRoad();
          drawTrees();
          drawHeadlights();

          ctx.restore();

          drawVignette();
          drawCarInterior();
        }

        window.addEventListener("resize", resize);
        resize();
        requestAnimationFrame(frame);
      })();