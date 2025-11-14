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

  if (!data.length) {
    box.innerHTML = "<p>No data.</p>";
    return;
  }

  const labels = data.map(d => d.date);
  const income = data.map(d => d.income);
  const expense = data.map(d => d.expense);

  const w = data.length * 80 + 80;
  const h = 260;

  const maxVal = Math.max(...income, ...expense, 10);

  const scaleX = i => 50 + i * 80;
  const scaleY = v => h - 40 - (v / maxVal) * (h - 80);

  let svg = `<svg width="${w}" height="${h}">`;

  // grid + labels
  for (let i = 0; i < data.length; i++) {
    const x = scaleX(i);

    svg += `
      <line x1="${x}" y1="20" x2="${x}" y2="${h - 40}" stroke="#eee"/>
      <text x="${x}" y="${h - 10}" font-size="12" text-anchor="middle" fill="#777">
        ${dayLabel(labels[i])}
      </text>
    `;
  }

  // line paths
  function line(arr, color) {
    let p = "";
    arr.forEach((v, i) => {
      p += `${i == 0 ? "M" : "L"} ${scaleX(i)} ${scaleY(v)} `;
    });
    return `<path d="${p}" fill="none" stroke="${color}" stroke-width="3"/>`;
  }

  svg += line(income, "#0BA2FF");
  svg += line(expense, "#F44336");

  // dots + values
  income.forEach((v, i) => {
    const x = scaleX(i), y = scaleY(v);
    svg += `
      <circle cx="${x}" cy="${y}" r="4" fill="#0BA2FF"/>
      <text x="${x}" y="${y - 8}" text-anchor="middle" font-size="11" fill="#0BA2FF">${v}</text>
    `;
  });

  expense.forEach((v, i) => {
    const x = scaleX(i), y = scaleY(v);
    svg += `
      <circle cx="${x}" cy="${y}" r="4" fill="#F44336"/>
      <text x="${x}" y="${y - 8}" text-anchor="middle" font-size="11" fill="#F44336">${v}</text>
    `;
  });

  svg += `</svg>`;
  box.innerHTML = svg;

  // zoom
  const svgElem = box.querySelector("svg");
  let zoom = 1;

  box.onwheel = e => {
    e.preventDefault();
    zoom += e.deltaY * -0.002;
    zoom = Math.min(Math.max(zoom, 0.6), 3);
    svgElem.style.transform = `scale(${zoom})`;
    svgElem.style.transformOrigin = "left center";
  };
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