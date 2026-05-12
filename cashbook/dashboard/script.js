// ─────────────────────────────────────────────────────────────
// FIREBASE INIT  (modular SDK only — no compat conflict)
// ─────────────────────────────────────────────────────────────
import { initializeApp }             from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCOqgE6IiCyvsZ0BCuCeuTdfRYZEXf7yJs",
  authDomain:        "recat-auth-test.firebaseapp.com",
  projectId:         "recat-auth-test",
  storageBucket:     "recat-auth-test.firebasestorage.app",
  messagingSenderId: "974600242853",
  appId:             "1:974600242853:web:1bce6de6e6bb4512342f4c"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

let username = localStorage.getItem('CASHBOOK_USER_NAME');
if (!username || !username.trim()) {
  username = prompt('Enter username:') || '';
  localStorage.setItem('CASHBOOK_USER_NAME', username);
}
document.getElementById('shopName').textContent = username;


// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function stdDev(arr) {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length);
}

function r2Score(xs, ys, m, c) {
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  let ssTot = 0, ssRes = 0;
  ys.forEach((y, i) => {
    ssTot += (y - mean) ** 2;
    ssRes += (y - (m * xs[i] + c)) ** 2;
  });
  return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
}

function linReg(xs, ys) {
  const n = xs.length;
  const sx  = xs.reduce((a, b) => a + b, 0);
  const sy  = ys.reduce((a, b) => a + b, 0);
  const sxy = xs.reduce((a, b, i) => a + b * ys[i], 0);
  const sx2 = xs.reduce((a, b) => a + b * b, 0);
  const denom = n * sx2 - sx * sx;
  if (denom === 0) return { m: 0, c: sy / n };
  const m = (n * sxy - sx * sy) / denom;
  const c = (sy - m * sx) / n;
  return { m, c };
}

function svgToScreen(svg, x, y) {
  const pt = svg.createSVGPoint();
  pt.x = x; pt.y = y;
  return pt.matrixTransform(svg.getScreenCTM());
}

// push overlapping labels apart
function resolveCollisions(labels, padding = 4) {
  labels.sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) {
    const prev = labels[i - 1];
    const curr = labels[i];
    const overlap = (prev.y + prev.h + padding) - curr.y;
    if (overlap > 0) curr.y += overlap;
  }
}

function fmt(v) {
  if (Math.abs(v) >= 1000) return '₹' + (v / 1000).toFixed(1) + 'k';
  return '₹' + Math.round(v);
}


// ─────────────────────────────────────────────────────────────
// ZENO Z3 AI ENGINE
// Ensemble: Holt's Double Exponential + Linear Regression
//         + Weighted Moving Average + Day-of-Week Seasonality
// Confidence: MAPE backtest + R² + data density
// ─────────────────────────────────────────────────────────────
function zenoZ3(data, futurePoints = 5) {
  const n = data.length;
  if (n < 2) return null;

  const balances = data.map(d => d.balance);
  const xs       = balances.map((_, i) => i);

  // ── Strip obvious outliers (values > 3σ from mean become capped) ──
  const mean3 = balances.reduce((a, b) => a + b, 0) / n;
  const sd3   = stdDev(balances);
  const clean = balances.map(v =>
    Math.abs(v - mean3) > 3 * sd3 ? mean3 : v
  );

  // ── Model 1: Linear Regression on clean data ──
  const lr     = linReg(xs, clean);
  const lrPred = i => lr.m * i + lr.c;

  // ── Model 2: Holt's Double Exponential Smoothing ──
  // Captures level + trend adaptively; great for short series
  const alpha = 0.38, beta = 0.18;
  let L = clean[0];
  let T = n > 1 ? clean[1] - clean[0] : 0;
  for (let i = 1; i < n; i++) {
    const Lp = L;
    L = alpha * clean[i] + (1 - alpha) * (L + T);
    T = beta  * (L - Lp) + (1 - beta)  * T;
  }
  const holtPred = h => L + h * T;   // h = steps ahead

  // ── Model 3: Weighted Moving Average (last 7 days) ──
  const wWin  = Math.min(7, n);
  const wVals = clean.slice(-wWin);
  const wts   = wVals.map((_, i) => i + 1);
  const wSum  = wts.reduce((a, b) => a + b, 0);
  const wmaBase  = wVals.reduce((s, v, i) => s + v * wts[i], 0) / wSum;
  const wmaTrend = wVals.length > 1
    ? (wVals[wVals.length - 1] - wVals[0]) / (wVals.length - 1)
    : 0;
  const wmaPred = h => wmaBase + wmaTrend * h;

  // ── Day-of-week seasonal factors ──
  const dowSums   = {};
  const dowCounts = {};
  data.forEach(d => {
    const dow = new Date(d.date).getDay(); // 0=Sun
    dowSums[dow]   = (dowSums[dow]   || 0) + d.balance;
    dowCounts[dow] = (dowCounts[dow] || 0) + 1;
  });
  const overallMean = clean.reduce((a, b) => a + b, 0) / n || 1;

  function seasonalFactor(futureDate) {
    const dow = futureDate.getDay();
    if (dowCounts[dow]) {
      const sf = (dowSums[dow] / dowCounts[dow]) / overallMean;
      return Math.max(0.55, Math.min(1.8, sf)); // clamp to avoid wild swings
    }
    return 1;
  }

  // ── Ensemble blend + seasonality ──
  const lastDate = new Date(data[n - 1].date);
  const predictions = [];
  const upper       = [];
  const lower       = [];

  // Residual SE for prediction interval
  const residuals = clean.map((v, i) => v - lrPred(i));
  const resSe     = stdDev(residuals);

  for (let h = 1; h <= futurePoints; h++) {
    const fd = new Date(lastDate);
    fd.setDate(fd.getDate() + h);
    const sf = seasonalFactor(fd);

    // Weights: Holt 45%, LR 30%, WMA 25%
    const base = holtPred(h) * 0.45
               + lrPred(n + h - 1) * 0.30
               + wmaPred(h) * 0.25;

    const pred = base * sf;
    predictions.push(pred);
    upper.push(pred + resSe * 1.05);   // ~±5% band via residual spread
    lower.push(pred - resSe * 1.05);
  }

  // ── Confidence Score ──
  // A) MAPE backtest on last 25% of data
  const holdN     = Math.max(2, Math.floor(n * 0.25));
  const trainData = data.slice(0, n - holdN);
  const testData  = data.slice(n - holdN);

  // re-run Holt on training portion only
  let lH = trainData[0]?.balance || 0;
  let tH = trainData.length > 1
    ? trainData[1].balance - trainData[0].balance
    : 0;
  for (let i = 1; i < trainData.length; i++) {
    const lp = lH;
    lH = alpha * trainData[i].balance + (1 - alpha) * (lH + tH);
    tH = beta  * (lH - lp)            + (1 - beta)  * tH;
  }

  let mapeSum = 0, mapeCount = 0;
  testData.forEach((d, h) => {
    const actual = d.balance;
    if (Math.abs(actual) < 10) return; // skip near-zero
    const pred = lH + (h + 1) * tH;
    mapeSum  += Math.abs((actual - pred) / actual);
    mapeCount++;
  });
  const mape     = mapeCount > 0 ? mapeSum / mapeCount : 0.15;
  const mapeConf = Math.max(0, 100 * (1 - mape));

  // B) R² of LR on full set
  const r2     = r2Score(xs, clean, lr.m, lr.c);
  const r2Conf = Math.max(0, r2 * 100);

  // C) Data density bonus (more days = more reliable)
  const densityBonus = Math.min(n / 20, 1) * 15; // up to +15 pts if ≥20 days

  const confidence = Math.round(
    mapeConf    * 0.50 +
    r2Conf      * 0.35 +
    densityBonus * 0.15
  );

  return {
    predictions,
    upper,
    lower,
    confidence: Math.min(99, Math.max(55, confidence)),
    trendUp:    predictions[0] > clean[n - 1],
    nextDay:    predictions[0]
  };
}


// ─────────────────────────────────────────────────────────────
// LOAD DATA FROM FIREBASE
// ─────────────────────────────────────────────────────────────
async function loadRange(start, end) {
  const snap = await get(child(ref(db), username));
  if (!snap.exists()) return [];

  const all = snap.val();
  const sd  = new Date(start);
  const ed  = new Date(end);

  const results = [];

  for (let date in all) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const cur = new Date(date);
    if (cur < sd || cur > ed) continue;

    const node = all[date];

    let income = 0;
    if (node.in) {
      Object.values(node.in).forEach(e => {
        income += Number(e.amount || 0) + Number(e.gpay || 0);
      });
    }

    let expense = 0;
    if (node.out) {
      Object.values(node.out).forEach(e => {
        expense += Number(e.amount || 0);
      });
    }

    results.push({ date, income, expense, balance: income - expense });
  }

  results.sort((a, b) => new Date(a.date) - new Date(b.date));
  return results;
}


// ─────────────────────────────────────────────────────────────
// DRAW SVG CHART
// ─────────────────────────────────────────────────────────────
function drawChart(data) {
  const box = document.getElementById("chartBox");

  if (!data || !data.length) {
    box.innerHTML = "<p style='padding:30px;color:#9ca3af;text-align:center'>No data for this range.</p>";
    return;
  }

  const income  = data.map(d => d.income);
  const expense = data.map(d => d.expense);
  const balance = data.map(d => d.balance);
  const labels  = data.map(d => d.date);

  // ── Zeno Z3 AI ──
  // Ignore today's data before 4 PM (incomplete day)
  let aiData = [...data];
  const todayStr = new Date().toISOString().split("T")[0];
  const lastDate = data[data.length - 1].date;
  if (lastDate === todayStr && new Date().getHours() < 16) {
    aiData = data.slice(0, -1);
  }
  const ai = zenoZ3(aiData, 5);

  // ── Update summary stats ──
  const totalIncome  = income.reduce((a, b) => a + b, 0);
  const totalExpense = expense.reduce((a, b) => a + b, 0);
  const totalProfit  = totalIncome - totalExpense;

  document.getElementById('statsRow').style.display = 'grid';
  document.getElementById('statIncome').textContent  = fmt(totalIncome);
  document.getElementById('statExpense').textContent = fmt(totalExpense);
  document.getElementById('statProfit').textContent  = fmt(totalProfit);
  document.getElementById('statPrediction').textContent =
    ai ? `${fmt(ai.nextDay)} (${ai.confidence}%)` : '—';

  // ── Chart dimensions ──
  const totalPoints = data.length + (ai ? ai.predictions.length : 0);
  const w = Math.max(600, totalPoints * 80 + 120);
  const h = 340;

  const allVals = [
    ...income, ...expense, ...balance,
    ...(ai ? ai.predictions : []),
    ...(ai ? ai.upper : []),
  ];
  const maxVal = Math.max(...allVals, 10);
  const minVal = Math.min(...allVals, 0);
  const range  = maxVal - minVal || 1;

  const padT = 40, padB = 60, padL = 60, padR = 40;

  function scaleX(i) {
    return padL + i * ((w - padL - padR) / Math.max(1, totalPoints - 1));
  }
  function scaleY(v) {
    return padT + (1 - (v - minVal) / range) * (h - padT - padB);
  }

  // ── Smooth curve path ──
  function linePath(values, startI = 0) {
    if (!values.length) return "";
    if (values.length === 1) return `M ${scaleX(startI)} ${scaleY(values[0])}`;
    const pts = values.map((v, i) => ({ x: scaleX(startI + i), y: scaleY(v) }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    const t = 0.45;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6 * t;
      const cp1y = p1.y + (p2.y - p0.y) / 6 * t;
      const cp2x = p2.x - (p3.x - p1.x) / 6 * t;
      const cp2y = p2.y - (p3.y - p1.y) / 6 * t;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  // ── Confidence band polygon ──
  function confidencePoly(upper, lower, startI) {
    if (!upper.length) return "";
    let d = `M ${scaleX(startI)} ${scaleY(upper[0])}`;
    upper.forEach((v, i) => { d += ` L ${scaleX(startI + i)} ${scaleY(v)}`; });
    lower.slice().reverse().forEach((v, i) => {
      d += ` L ${scaleX(startI + lower.length - 1 - i)} ${scaleY(v)}`;
    });
    return d + " Z";
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
  svg += `<rect x="0" y="0" width="${w}" height="${h}" fill="#fafbff"/>`;

  // Horizontal grid lines
  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const v  = minVal + (range * i) / gridSteps;
    const gy = scaleY(v);
    svg += `<line x1="${padL}" y1="${gy}" x2="${w - padR}" y2="${gy}" stroke="#e8eaf0" stroke-width="1"/>`;
    svg += `<text x="${padL - 6}" y="${gy + 4}" font-size="10" text-anchor="end" fill="#9ca3af">${fmt(v)}</text>`;
  }

  // Vertical grid + day labels
  data.forEach((d, i) => {
    const x   = scaleX(i);
    const day = Number(d.date.slice(8, 10));
    svg += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${h - padB + 8}" stroke="#eff0f6" stroke-width="1"/>`;
    svg += `<text x="${x}" y="${h - padB + 22}" font-size="11" text-anchor="middle" fill="#9ca3af">${day}</text>`;
  });

  // Future date labels
  if (ai) {
    ai.predictions.forEach((_, i) => {
      const fd = new Date(lastDate);
      fd.setDate(fd.getDate() + i + 1);
      const day = fd.getDate();
      const x   = scaleX(data.length + i);
      svg += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${h - padB + 8}" stroke="#f0e8ff" stroke-width="1" stroke-dasharray="4 3"/>`;
      svg += `<text x="${x}" y="${h - padB + 22}" font-size="11" text-anchor="middle" fill="#c084fc">${day}*</text>`;
    });
  }

  // Zero line (if visible)
  if (minVal < 0 && maxVal > 0) {
    const zy = scaleY(0);
    svg += `<line x1="${padL}" y1="${zy}" x2="${w - padR}" y2="${zy}" stroke="#e5e7eb" stroke-width="1.5" stroke-dasharray="6 3"/>`;
  }

  // Month label (top left of chart area)
  if (data.length) {
    const monthLabel = new Date(data[0].date).toLocaleString('default', { month: 'long', year: 'numeric' });
    svg += `<text x="${padL}" y="20" font-size="11" fill="#9ca3af" font-weight="600">${monthLabel}</text>`;
  }

  // ── AI Confidence band ──
  if (ai && ai.predictions.length) {
    const trendColor = ai.trendUp ? '#00C853' : '#FF1744';
    const bandPath   = confidencePoly(ai.upper, ai.lower, data.length);
    svg += `<path d="${bandPath}" fill="${trendColor}" opacity="0.08"/>`;

    // Dashed trendline (last real point → all predictions)
    const trendVals = [balance[balance.length - 1], ...ai.predictions];
    const trendPath = linePath(trendVals, data.length - 1);
    svg += `<path d="${trendPath}" fill="none" stroke="${trendColor}" stroke-width="2.5" stroke-dasharray="8 5" opacity="0.85"/>`;

    // Prediction dots
    ai.predictions.forEach((v, i) => {
      const x = scaleX(data.length + i);
      const y = scaleY(v);
      svg += `
        <circle cx="${x}" cy="${y}" r="6" fill="${trendColor}" opacity="0.75"
          class="predict-dot" data-x="${x}" data-y="${y}"
          data-value="${fmt(v)}" style="cursor:pointer" pointer-events="all"/>`;
    });

    // Arrow + confidence label at last prediction
    const lx = scaleX(data.length + ai.predictions.length - 1);
    const ly = scaleY(ai.predictions[ai.predictions.length - 1]);
    const arrow = ai.trendUp ? '↑' : '↓';
    svg += `<text x="${lx + 10}" y="${ly}" font-size="20" fill="${trendColor}" font-weight="bold">${arrow}</text>`;
    svg += `
      <rect x="${lx + 8}" y="${ly + 8}" width="90" height="18" rx="4" fill="${trendColor}" opacity="0.12"/>
      <text x="${lx + 53}" y="${ly + 21}" font-size="11" fill="${trendColor}" text-anchor="middle" font-weight="600">
        ${ai.confidence}% confidence
      </text>`;
  }

  // ── Main lines ──
  svg += `<path d="${linePath(income)}"  fill="none" stroke="#0BA2FF" stroke-width="2.5" stroke-linecap="round" class="line-path"/>`;
  svg += `<path d="${linePath(expense)}" fill="none" stroke="#FF4D4D" stroke-width="2.5" stroke-linecap="round" class="line-path"/>`;
  svg += `<path d="${linePath(balance)}" fill="none" stroke="#6A5ACD" stroke-width="2.5" stroke-linecap="round" class="line-path"/>`;

  // ── Dots ──
  data.forEach((d, i) => {
    const x = scaleX(i);
    svg += `<circle cx="${x}" cy="${scaleY(income[i])}"  r="4" fill="#0BA2FF"/>`;
    svg += `<circle cx="${x}" cy="${scaleY(expense[i])}" r="4" fill="#FF4D4D"/>`;
    svg += `<circle cx="${x}" cy="${scaleY(balance[i])}" r="4" fill="#6A5ACD"/>`;
  });

  // ── Data labels (auto collision-resolved) ──
  const labelsArr = [];
  data.forEach((d, i) => {
    const x = scaleX(i);
    labelsArr.push({ x, y: scaleY(income[i])  - 30, w: String(income[i]).length  * 7 + 12, h: 18, value: income[i],  color: "#0BA2FF", bg: "rgba(11,162,255,0.1)",  stroke: "#0BA2FF" });
    labelsArr.push({ x, y: scaleY(expense[i]) + 20, w: String(expense[i]).length * 7 + 12, h: 18, value: expense[i], color: "#FF4D4D", bg: "rgba(255,77,77,0.1)",   stroke: "#FF4D4D" });
    labelsArr.push({ x, y: scaleY(balance[i]) -  5, w: String(balance[i]).length * 7 + 12, h: 18, value: balance[i], color: "#6A5ACD", bg: "rgba(106,90,205,0.1)", stroke: "#6A5ACD" });
  });

  resolveCollisions(labelsArr, 4);

  labelsArr.forEach(lb => {
    svg += `
      <rect x="${lb.x - lb.w / 2}" y="${lb.y}" width="${lb.w}" height="${lb.h}"
        rx="4" fill="${lb.bg}" stroke="${lb.stroke}" stroke-width="0.7"/>
      <text x="${lb.x}" y="${lb.y + 13}" font-size="11" text-anchor="middle" fill="${lb.color}">
        ${lb.value}
      </text>`;
  });

  svg += `</svg>`;
  box.innerHTML = svg;

  // Prediction dot tooltips
  box.querySelectorAll(".predict-dot").forEach(dot => {
    dot.addEventListener("click", () => {
      const svgEl = box.querySelector("svg");
      const sc    = svgToScreen(svgEl, parseFloat(dot.dataset.x), parseFloat(dot.dataset.y));
      const tip   = document.getElementById("predictTooltip");
      tip.innerHTML       = `Forecast: <b>${dot.dataset.value}</b>`;
      tip.style.left      = (sc.x + 12) + "px";
      tip.style.top       = (sc.y - 24) + "px";
      tip.style.display   = "block";
      clearTimeout(tip._t);
      tip._t = setTimeout(() => { tip.style.display = "none"; }, 2200);
    });
  });

  // Draw animation
  box.querySelectorAll(".line-path").forEach(path => {
    try {
      const len = path.getTotalLength();
      path.style.strokeDasharray  = len;
      path.style.strokeDashoffset = len;
      path.getBoundingClientRect();
      path.style.transition       = "stroke-dashoffset 1600ms cubic-bezier(.2,.8,.2,1)";
      path.style.strokeDashoffset = "0";
    } catch (_) {}
  });

  enableZoom(box.querySelector("svg"), { originalWidth: w, originalHeight: h });
}


// ─────────────────────────────────────────────────────────────
// UI HANDLERS
// ─────────────────────────────────────────────────────────────
document.getElementById("loadBtn").addEventListener("click", async () => {
  const s = document.getElementById("startDate").value;
  const e = document.getElementById("endDate").value;
  if (!s || !e) return;
  const data = await loadRange(s, e);
  drawChart(data);
});

// Auto-reload on date change
document.querySelector('.top-bar').addEventListener('input',
  () => document.getElementById("loadBtn").click()
);


// ─────────────────────────────────────────────────────────────
// ZOOM + PAN ENGINE (touch & mouse)
// ─────────────────────────────────────────────────────────────
function enableZoom(svg, opts = {}) {
  const origW = opts.originalWidth  || Number(svg.getAttribute("width"))  || 800;
  const origH = opts.originalHeight || Number(svg.getAttribute("height")) || 340;

  svg.setAttribute("viewBox", `0 0 ${origW} ${origH}`);
  let [minX, minY, width, height] = [0, 0, origW, origH];
  const original = [0, 0, origW, origH];
  const MIN_SCALE = 0.4, MAX_SCALE = 4.0;

  let isPanning = false, startX = 0, startY = 0, lastDist = 0;

  function apply() { svg.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`); }
  function clamp() {
    const s = original[2] / width;
    if (s > MAX_SCALE) { width = original[2] / MAX_SCALE; height = original[3] / MAX_SCALE; }
    if (s < MIN_SCALE) { width = original[2] / MIN_SCALE; height = original[3] / MIN_SCALE; }
  }
  function toView(xc, yc) {
    const r  = svg.getBoundingClientRect();
    return { vx: (xc - r.left) / r.width * width, vy: (yc - r.top) / r.height * height };
  }

  svg.addEventListener("wheel", e => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 0.9 : 1.1;
    const { vx, vy } = toView(e.clientX, e.clientY);
    width *= f; height *= f;
    minX += vx * (1 - f); minY += vy * (1 - f);
    clamp(); apply();
  }, { passive: false });

  svg.addEventListener("mousedown", e => { isPanning = true; startX = e.clientX; startY = e.clientY; svg.style.cursor = "grabbing"; });
  window.addEventListener("mouseup",   () => { isPanning = false; svg.style.cursor = "grab"; });
  window.addEventListener("mousemove", e => {
    if (!isPanning) return;
    minX -= (e.clientX - startX) * (width  / svg.clientWidth);
    minY -= (e.clientY - startY) * (height / svg.clientHeight);
    startX = e.clientX; startY = e.clientY;
    apply();
  });

  svg.addEventListener("touchstart", e => {
    if (e.touches.length === 1) {
      isPanning = true;
      startX = e.touches[0].clientX; startY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      isPanning = false;
      lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
  }, { passive: false });

  svg.addEventListener("touchmove", e => {
    e.preventDefault();
    if (e.touches.length === 1 && isPanning) {
      minX -= (e.touches[0].clientX - startX) * (width  / svg.clientWidth);
      minY -= (e.touches[0].clientY - startY) * (height / svg.clientHeight);
      startX = e.touches[0].clientX; startY = e.touches[0].clientY;
      apply();
    } else if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (lastDist > 0) {
        const f   = lastDist / d;
        const mx  = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const my  = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const { vx, vy } = toView(mx, my);
        const nw  = width * f, nh = height * f;
        const minW = original[2] / MAX_SCALE, maxW = original[2] / MIN_SCALE;
        if (nw >= minW && nw <= maxW) {
          width = nw; height = nh;
          minX += vx * (1 - f); minY += vy * (1 - f);
          clamp(); apply();
        }
      }
      lastDist = d;
    }
  }, { passive: false });

  svg.addEventListener("touchend", () => { isPanning = false; lastDist = 0; });

  document.getElementById("resetZoomBtn").onclick = () => {
    [minX, minY, width, height] = original.slice();
    apply();
  };
}


// ─────────────────────────────────────────────────────────────
// INIT — set default dates and auto-load
// ─────────────────────────────────────────────────────────────
function setDefaultDates() {
  const today    = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextDay  = new Date(today);
  nextDay.setDate(nextDay.getDate() + 1);
  const fmt2 = d => d.toISOString().split("T")[0];
  document.getElementById("startDate").value = fmt2(firstDay);
  document.getElementById("endDate").value   = fmt2(nextDay);
  document.getElementById("loadBtn").click();
}

document.addEventListener("DOMContentLoaded", setDefaultDates);
