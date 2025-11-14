// -----------------------------------
// FIREBASE INIT
// -----------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCOqgE6IiCyvsZ0BCuCeuTdfRYZEXf7yJs",
    authDomain: "recat-auth-test.firebaseapp.com",
    projectId: "recat-auth-test",
    storageBucket: "recat-auth-test.firebasestorage.app",
    messagingSenderId: "974600242853",
    appId: "1:974600242853:web:1bce6de6e6bb4512342f4c"
  };

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


// -----------------------------------
// HELPERS
// -----------------------------------
function dayLabel(dateStr) {
  return Number(dateStr.slice(8, 10)); // 12,13,14
}


// -----------------------------------
// LOAD DATA (FIXED FOR YOUR STRUCTURE)
// -----------------------------------
async function loadRange(start, end) {
  const snap = await get(child(ref(db), "cashbook"));
  if (!snap.exists()) return [];

  const all = snap.val();
  const sd = new Date(start);
  const ed = new Date(end);

  const results = [];

  for (let date in all) {
    const cur = new Date(date);
    if (cur < sd || cur > ed) continue;

    const node = all[date];

    // --- income total ---
    let income = 0;
    if (node.in) {
      Object.values(node.in).forEach(entry => {
        income += Number(entry.amount || 0);
      });
    }

    // --- expense total ---
    let expense = 0;
    if (node.out) {
      Object.values(node.out).forEach(entry => {
        expense += Number(entry.amount || 0);
      });
    }

    results.push({
      date,
      income,
      expense
    });
  }

  results.sort((a, b) => new Date(a.date) - new Date(b.date));
  return results;
}


// -----------------------------------
// DRAW SVG CHART
// -----------------------------------
function drawChart(data) {
  const box = document.getElementById("chartBox");

  if (!data || !data.length) {
    box.innerHTML = "<p style='padding:20px;color:#777;text-align:center'>No data.</p>";
    return;
  }

  const labels = data.map(d => d.date);
  const income = data.map(d => d.income);
  const expense = data.map(d => d.expense);

  const w = Math.max(600, data.length * 80 + 120); // ensure minimum width
  const h = 320;

  const maxVal = Math.max(...income, ...expense, 10);

  const scaleX = i => 60 + i * ((w - 120) / Math.max(1, data.length - 1));
  const scaleY = v => 40 + (1 - (v / maxVal)) * (h - 100);

  // curved path generator (smooth)
  // curved path generator (smooth)
function linePath(values) {
  if (values.length === 0) return "";
  if (values.length === 1) {
    const p = { x: scaleX(0), y: scaleY(values[0]) };
    return `M ${p.x} ${p.y}`;
  }

  const pts = values.map((v, i) => ({ x: scaleX(i), y: scaleY(v) }));
  let d = `M ${pts[0].x} ${pts[0].y}`;

  const tension = 0.5; // 0 = no curve, 1 = very smooth

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
    const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;

    const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
    const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" role="img">`;
  // background
  svg += `<rect x="0" y="0" width="${w}" height="${h}" fill="transparent"/>`;

  // vertical grid + labels (day numbers)
  for (let i = 0; i < data.length; i++) {
    const x = scaleX(i);
    svg += `
      <line x1="${x}" y1="30" x2="${x}" y2="${h - 60}" stroke="#eee" stroke-width="1"/>
      <text x="${x}" y="${h - 20}" font-size="12" text-anchor="middle" fill="#666">${Number(labels[i].slice(8,10))}</text>
    `;
  }

  const pathIn = linePath(income);
  const pathOut = linePath(expense);

  // add paths with classes for animation
  svg += `<path d="${pathIn}" fill="none" stroke="#0BA2FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="line-path in-line"/>`;
  svg += `<path d="${pathOut}" fill="none" stroke="#FF4D4D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="line-path out-line"/>`;

  // dots & small labels
  income.forEach((v, i) => {
    const x = scaleX(i), y = scaleY(v);
    svg += `<circle cx="${x}" cy="${y}" r="4" fill="#0BA2FF"/><text x="${x}" y="${y - 10}" font-size="11" text-anchor="middle" fill="#0BA2FF">${v}</text>`;
  });
  expense.forEach((v, i) => {
    const x = scaleX(i), y = scaleY(v);
    svg += `<circle cx="${x}" cy="${y}" r="4" fill="#FF4D4D"/><text x="${x}" y="${y - 10}" font-size="11" text-anchor="middle" fill="#FF4D4D">${v}</text>`;
  });

  svg += `</svg>`;
  box.innerHTML = svg;

  // animate draw
  box.querySelectorAll(".line-path").forEach(path => {
    try {
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      // force reflow
      path.getBoundingClientRect();
      path.style.transition = "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)";
      path.style.strokeDashoffset = "0";
    } catch (err) {
      // some browsers might fail; ignore
    }
  });

  // ensure viewBox exists
  const svgElem = box.querySelector("svg");
  if (!svgElem.getAttribute("viewBox")) {
    svgElem.setAttribute("viewBox", `0 0 ${w} ${h}`);
  }

  // call enableZoom with svg element and original sizes
  enableZoom(svgElem, { originalWidth: w, originalHeight: h });
}


// -----------------------------------
// UI HANDLERS
// -----------------------------------
document.getElementById("loadBtn").onclick = async () => {
  const s = startDate.value;
  const e = endDate.value;
  if (!s || !e) return;

  const data = await loadRange(s, e);
  drawChart(data);
};


// zoom engine 

// ---------------------------------------------------------
// MOBILE TOUCH ZOOM + PAN (PINCH TO ZOOM)
// ---------------------------------------------------------
function enableZoom(svg, opts = {}) {
  // opts.originalWidth, opts.originalHeight (pass from drawChart)
  const origW = opts.originalWidth || Number(svg.getAttribute("width")) || 800;
  const origH = opts.originalHeight || Number(svg.getAttribute("height")) || 320;

  // parse or set viewBox
  let vb = svg.getAttribute("viewBox");
  if (!vb) {
    svg.setAttribute("viewBox", `0 0 ${origW} ${origH}`);
    vb = svg.getAttribute("viewBox");
  }
  let [minX, minY, width, height] = svg.getAttribute("viewBox").split(" ").map(Number);

  const original = [minX, minY, width, height];

  // zoom limits (folded as scale relative to original)
  const MIN_SCALE = 0.4; // max zoom-in (40% of original box width)
  const MAX_SCALE = 4.0; // max zoom-out (400% of original box width)

  let isPanning = false;
  let startX = 0, startY = 0;
  let lastTouchDist = 0;
  let lastTap = 0;

  function apply() {
    svg.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);
  }

  function clamp() {
    const curScale = original[2] / width; // how many times zoomed in
    if (curScale > MAX_SCALE) {
      width = original[2] / MAX_SCALE;
      height = original[3] / MAX_SCALE;
    }
    if (curScale < MIN_SCALE) {
      width = original[2] / MIN_SCALE;
      height = original[3] / MIN_SCALE;
    }
  }

  // Helper to get pointer position relative to svg content
  function pointToView(xClient, yClient) {
    const rect = svg.getBoundingClientRect();
    const px = (xClient - rect.left) / rect.width;
    const py = (yClient - rect.top) / rect.height;
    return { vx: px * width, vy: py * height };
  }

  // ----- wheel zoom (desktop) -----
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY;
    const zoomIn = delta < 0;
    const factor = zoomIn ? 0.9 : 1.1;

    const { vx, vy } = pointToView(e.clientX, e.clientY);

    // apply scale
    width *= factor;
    height *= factor;

    // keep focus point
    minX += vx * (1 - factor);
    minY += vy * (1 - factor);

    clamp();
    apply();
  }, { passive: false });

  // ----- mouse pan -----
  svg.addEventListener("mousedown", (e) => {
    isPanning = true;
    startX = e.clientX;
    startY = e.clientY;
    svg.style.cursor = "grabbing";
  });
  window.addEventListener("mouseup", () => {
    isPanning = false;
    svg.style.cursor = "default";
  });
  window.addEventListener("mousemove", (e) => {
    if (!isPanning) return;
    const dx = (e.clientX - startX) * (width / svg.clientWidth);
    const dy = (e.clientY - startY) * (height / svg.clientHeight);
    minX -= dx; minY -= dy;
    startX = e.clientX; startY = e.clientY;
    apply();
  });

  // ----- touch handlers: pan, pinch, double-tap -----
  svg.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      // double-tap detection
      const now = Date.now();
      if (now - lastTap < 300) {
        // double tap => zoom in around touch point
        const factor = 0.7;
        const t = e.touches[0];
        const { vx, vy } = pointToView(t.clientX, t.clientY);
        width *= factor; height *= factor;
        minX += vx * (1 - factor); minY += vy * (1 - factor);
        clamp(); apply();
        lastTap = 0;
        return;
      }
      lastTap = now;

      // start pan
      isPanning = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      // pinch start
      isPanning = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist = Math.hypot(dx, dy);
    }
  }, { passive: false });

  svg.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isPanning) {
      const dx = (e.touches[0].clientX - startX) * (width / svg.clientWidth);
      const dy = (e.touches[0].clientY - startY) * (height / svg.clientHeight);
      minX -= dx; minY -= dy;
      startX = e.touches[0].clientX; startY = e.touches[0].clientY;
      apply();
    } else if (e.touches.length === 2) {
      // pinch -> zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastTouchDist > 0) {
        const zoomFactor = lastTouchDist / dist; // >1 means zoom in
        // anchor to midpoint
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const { vx, vy } = pointToView(mx, my);

        const newW = width * zoomFactor;
        const newH = height * zoomFactor;

        // clamp provisional
        const minW = original[2] / MAX_SCALE;
        const maxW = original[2] / MIN_SCALE;
        if (newW >= minW && newW <= maxW) {
          width = newW; height = newH;
          minX += vx * (1 - zoomFactor); minY += vy * (1 - zoomFactor);
          clamp(); apply();
        }
      }
      lastTouchDist = dist;
    }
  }, { passive: false });

  svg.addEventListener("touchend", (e) => {
    isPanning = false;
    lastTouchDist = 0;
  });

  // ----- reset button -----
  const resetBtn = document.getElementById("resetZoomBtn");
  if (resetBtn) {
    resetBtn.onclick = () => {
      [minX, minY, width, height] = original.slice();
      apply();
    };
  }
}