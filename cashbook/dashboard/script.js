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
const username = localStorage.getItem('CASHBOOK_USER_NAME')
if (!username || !username.trim()) {
  const myName = prompt('Enter username:');
  
  localStorage.setItem('CASHBOOK_USER_NAME', myName)
}

// -----------------------------------
// HELPERS
// -----------------------------------
function dayLabel(dateStr) {
  return Number(dateStr.slice(8, 10)); // 12,13,14
}

function resolveCollisions(labelBoxes) {

}
function svgToScreen(svg, x, y) {
  const point = svg.createSVGPoint();
  point.x = x;
  point.y = y;
  const screenPoint = point.matrixTransform(svg.getScreenCTM());
  return { x: screenPoint.x, y: screenPoint.y };
}

function showPredictionTooltip(x, y, value) {
  const tip = document.getElementById("predictTooltip");
  const svg = document.querySelector("#chartBox svg");

  // convert to real screen coords
  const screen = svgToScreen(svg, x, y);

  tip.innerHTML = `Predicted: <b>${value}</b>`;
  tip.style.left = (screen.x + 10) + "px";
  tip.style.top  = (screen.y - 20) + "px";
  tip.style.display = "block";

  clearTimeout(tip.hideTimer);
  tip.hideTimer = setTimeout(() => {
    tip.style.display = "none";
  }, 2000);
}


function stdDev(arr) {
  const mean = arr.reduce((a,b)=>a+b,0) / arr.length;
  const variance = arr.reduce((a,b)=>a+(b-mean)**2,0) / arr.length;
  return Math.sqrt(variance);
}

function r2Score(xs, ys, m, c) {
  const mean = ys.reduce((a,b)=>a+b,0) / ys.length;

  let ssTot = 0;
  let ssRes = 0;

  ys.forEach((y, i) => {
    const pred = m * xs[i] + c;
    ssTot += (y - mean) ** 2;
    ssRes += (y - pred) ** 2;
  });

  return 1 - (ssRes / ssTot);
}

function computeConfidence(ys, m, c, xs) {
  const deviation = stdDev(ys);      // natural volatility
  const r2 = r2Score(xs, ys, m, c);  // model accuracy

  // normalize deviation (0 to 100)
 // const devScore = Math.max(1, 100 - deviation * 2);
  // softer penalty → more natural confidence values
//const devScore = Math.max(5, 100 - deviation * 0.6);
const devScore = Math.max(5, 100 - Math.sqrt(deviation) * 15);
  // r² score already in 0 to 1 → convert to %
  const accuracyScore = r2 * 100;

  // final confidence = weighted
  const finalConfidence =
      (devScore * 0.4) +      // 40% trend stability
      (accuracyScore * 0.6);  // 60% regression fitting

  return Math.round(finalConfidence);
}



// -----------------------------------
// LOAD DATA (FIXED FOR YOUR STRUCTURE)
// -----------------------------------
async function loadRange(start, end) {
  const snap = await get(child(ref(db), username));
  if (!snap.exists()) return [];

  const all = snap.val();
  const sd = new Date(start);
  const ed = new Date(end);

  const results = [];

  for (let date in all) {
  
  // ❗ skip folders like RecycleBin / settings / anything not a date
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
  
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
  expense,
  balance: income - expense   // ➕ ADD THIS LINE
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
  const balance = data.map(d => d.balance);

  const w = Math.max(600, data.length * 80 + 120); // ensure minimum width
  const h = 320;

  // const maxVal = Math.max(...income, ...expense, 10);
  const maxVal = Math.max(...income, ...expense, ...balance, 10);

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


// --- CONFIDENCE CLOUD GENERATOR ---
function buildConfidencePolygon(upper, lower, startIndex) {
  if (upper.length === 0) return "";

  let d = `M ${scaleX(startIndex)} ${scaleY(upper[0])}`;

  // Upper boundary
  upper.forEach((v, i) => {
    d += ` L ${scaleX(startIndex + i)} ${scaleY(v)}`;
  });

  // Lower boundary (reverse)
  lower.slice().reverse().forEach((v, i) => {
    const idx = upper.length - 1 - i;
    d += ` L ${scaleX(startIndex + idx)} ${scaleY(v)}`;
  });

  return d + " Z";
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
  const pathBal = linePath(balance);

  // add paths with classes for animation
  svg += `<path d="${pathIn}" fill="none" stroke="#0BA2FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="line-path in-line"/>`;
  svg += `<path d="${pathOut}" fill="none" stroke="#FF4D4D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="line-path out-line"/>`;
  
  svg += `<path d="${pathBal}" fill="none" stroke="#6A5ACD78" stroke-width="3" 
stroke-linecap="round" stroke-linejoin="round" class="line-path bal-line"/>`;
//#6A5ACD
  // dots & small labels
// -----------------------------


// -----------------------------
// DRAW DOTS (INCOME / EXPENSE / BALANCE)
// -----------------------------
data.forEach((d, i) => {
  const x = scaleX(i);

  // Income dot (blue)
  svg += `<circle cx="${x}" cy="${scaleY(income[i])}" r="4" fill="#0BA2FF"/>`;

  // Expense dot (red)
  svg += `<circle cx="${x}" cy="${scaleY(expense[i])}" r="4" fill="#FF4D4D"/>`;

  // Balance dot (purple)
  svg += `<circle cx="${x}" cy="${scaleY(balance[i])}" r="4" fill="#6A5ACD"/>`;
});

// -----------------------------------------
// TRENDLINE (Polynomial Regression Prediction)
// -----------------------------------------

// -----------------------------------------
// TRENDLINE (Stable Linear Regression)
// -----------------------------------------



// -----------------------------------------
// TRENDLINE (Linear Regression + Premium Effects)
// -----------------------------------------

function linearPredict(xs, ys, futurePoints = 7) {
  const n = xs.length;
  
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, b, i) => a + b * ys[i], 0);
  const sumX2 = xs.reduce((a, b) => a + b * b, 0);
  
  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const c = (sumY - m * sumX) / n;
  
  const predictions = [];
  for (let i = n; i < n + futurePoints; i++) {
    predictions.push(m * i + c);
  }
  
  return predictions;
}

// Prepare data
// remove last index (today)
let xs = data.map((_, i) => i);
let ys = data.map(d => d.balance);

// ------------------------------------------------
// SMART TODAY HANDLING (ignore until 4 PM)
// ------------------------------------------------
const lastDate = data[data.length - 1].date;
const todayStr = new Date().toISOString().split("T")[0];
const now = new Date();

// check if last date is today
if (lastDate === todayStr) {

    // If current time is before 4 PM ⇒ IGNORE today's data
    const cutoffHour = 16; // 4 PM (16:00)

    if (now.getHours() < cutoffHour) {
        xs = xs.slice(0, -1);
        ys = ys.slice(0, -1);
        // console.log("Today ignored for prediction (before 4 PM)");
    } else {
        // console.log("Today included (after 4 PM)");
    }
}



const future = linearPredict(xs, ys, 5);

// Recompute m & c here for confidence calculation
const n = xs.length;

const sumX = xs.reduce((a,b)=>a+b,0);
const sumY = ys.reduce((a,b)=>a+b,0);
const sumXY = xs.reduce((a,b,i)=>a + b * ys[i],0);
const sumX2 = xs.reduce((a,b)=>a + b*b,0);

const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
const c = (sumY - m * sumX) / n;

// final AI confidence %
const confidence = computeConfidence(ys, m, c, xs);

// CONFIDENCE BOUNDS (±10%)
const upper = future.map(v => v * 1.10);
const lower = future.map(v => v * 0.90);

const trendPoints = [...ys, ...future];

// Trend direction
const lastReal = ys[ys.length - 1];
const nextPred = future[0];

let trendColor = "#00C853"; // green
let arrow = "↑";

if (nextPred < lastReal) {
  trendColor = "#FF1744"; // red
  arrow = "↓";
}

// SVG gradient ID
svg += `
  <defs>
    <linearGradient id="trendGrad" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${trendColor}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${trendColor}" stop-opacity="0.15"/>
    </linearGradient>
  </defs>
`;

// Draw trendline (dashed)
const trendPath = linePath(trendPoints);

svg += `
  <path d="${trendPath}"
    fill="none"
    stroke="url(#trendGrad)"
    stroke-width="2"
    stroke-dasharray="8 6"
    opacity="0.9"
  />
`;

// Draw future dots (faded)
future.forEach((v, i) => {
  const x = scaleX(xs.length + i);
  const y = scaleY(v);
  
svg += `
<circle 
  cx="${x}" cy="${y}" r="6"
  fill="${trendColor}" opacity="0.7"
  class="predict-dot"
  data-x="${x}" 
  data-y="${y}" 
  data-value="${Math.round(v)}"
  style="cursor:pointer"
  pointer-events="all"
/>
  `;
});

// Draw arrow at the last prediction point
const lastX = scaleX(xs.length + future.length - 1);
const lastY = scaleY(future[future.length - 1]);

svg += `
  <text x="${lastX + 10}" y="${lastY}" font-size="20"
    fill="${trendColor}"
    font-weight="bold"
  >
    ${arrow}
  </text>
`;


svg += `
  <text 
    x="${lastX + 10}" 
    y="${lastY + 22}" 
    font-size="12"
    fill="${trendColor}"
    font-weight="600"
  >
    ${confidence}% confidence
  </text>
`;

// AUTO-COLLISION LABEL SYSTEM
// -----------------------------

const labelsArr = []; // store all labels

data.forEach((d, i) => {
  const x = scaleX(i);

  const pts = [
    { v: income[i], color: "#0BA2FF", bg: "rgba(11,162,255,0.12)", stroke: "#0BA2FF" },
    { v: expense[i], color: "#FF4D4D", bg: "rgba(255,77,77,0.12)", stroke: "#FF4D4D" },
    { v: balance[i], color: "#6A5ACD", bg: "rgba(106,90,205,0.12)", stroke: "#6A5ACD" }
  ];

  // ---- FIXED LABEL POSITIONS ----
labelsArr.push({
  x,
  y: scaleY(income[i]) - 30,
  w: String(income[i]).length * 7 + 12,
  h: 18,
  value: income[i],
  color: "#0BA2FF",
  bg: "rgba(11,162,255,0.12)",
  stroke: "#0BA2FF"
});

labelsArr.push({
  x,
  y: scaleY(balance[i]) - 5,
  w: String(balance[i]).length * 7 + 12,
  h: 18,
  value: balance[i],
  color: "#6A5ACD",
  bg: "rgba(106,90,205,0.12)",
  stroke: "#6A5ACD"
});

labelsArr.push({
  x,
  y: scaleY(expense[i]) + 20,
  w: String(expense[i]).length * 7 + 12,
  h: 18,
  value: expense[i],
  color: "#FF4D4D",
  bg: "rgba(255,77,77,0.12)",
  stroke: "#FF4D4D"
});
});

// resolve collisions
resolveCollisions(labelsArr, 4);

// draw corrected labels
labelsArr.forEach(lb => {
  svg += `
    <rect
      x="${lb.x - lb.w/2}"
      y="${lb.y}"
      width="${lb.w}"
      height="${lb.h}"
      rx="4" ry="4"
      fill="${lb.bg}"
      stroke="${lb.stroke}"
      stroke-width="0.8"
    />
    <text 
      x="${lb.x}" 
      y="${lb.y + 13}"
      font-size="11"
      text-anchor="middle" 
      fill="${lb.color}"
    >${lb.value}</text>
  `;
});
  

  svg += `</svg>`;
  box.innerHTML = svg;
  
  // handle prediction dot clicks
box.querySelectorAll(".predict-dot").forEach(dot => {
  dot.addEventListener("click", () => {
    const x = parseFloat(dot.getAttribute("data-x"));
    const y = parseFloat(dot.getAttribute("data-y"));
    const v = dot.getAttribute("data-value");

    showPredictionTooltip(x, y, v);
  });
});

  // animate draw
  box.querySelectorAll(".line-path").forEach(path => {
    try {
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      // force reflow
      path.getBoundingClientRect();
      path.style.transition = "stroke-dashoffset 3000ms cubic-bezier(.2,.8,.2,1)";
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

document.querySelector('.top-bar').oninput=()=>loadBtn.click()
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



// Auto set

function setDefaultDates() {
  const startInput = document.getElementById("startDate");
  const endInput = document.getElementById("endDate");

  const today = new Date();

  // Start date = first day of current month
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  // End date = today + 1 day
  const nextDay = new Date(today);
  nextDay.setDate(nextDay.getDate() + 1);

  // Convert to yyyy-mm-dd
  const toInputFormat = (d) => d.toISOString().split("T")[0];

  startInput.value = toInputFormat(firstDay);
  endInput.value = toInputFormat(nextDay);
  
  document.getElementById("loadBtn").onclick()
}


document.addEventListener("DOMContentLoaded", () => {
  setDefaultDates();
});


