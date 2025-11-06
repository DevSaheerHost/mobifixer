import { Storage } from "../utils/storage.js";
import { FBDB } from "../utils/fbdb.js";
import showToast from "../ui/toast.js";
import Card from "../components/Card.js";
import Button from "../ui/Button.js";

export default async function Product() {
  const $=s=>document.querySelector(s)
  let products = Storage.get("/", []);
  
  // 🧩 Convert object → array if needed
  if (!Array.isArray(products)) {
    products = Object.entries(products || {})
      .filter(([_, val]) => val && typeof val === "object") // remove nulls
      .map(([id, val]) => ({ id, ...val }));
  } else {
    // remove nulls from array
    products = products.filter(p => p && typeof p === "object");
  }

  console.log("✅ Cleaned local products:", products);
  const section = document.createElement("section");
  document.body.append(section);

  // 🧭 Header
  const title = document.createElement("h2");
  title.className = "page-title";
  title.textContent = "Products";
  section.append(title);

  // 🔍 Filter bar
  const filterBar = document.createElement("div");
  filterBar.className = "filter-bar";
  filterBar.innerHTML = `
    <input type="text" id="searchInput" placeholder="🔍 Search product or model..." />
    <select id="categorySelect">
      <option value="">All Categories</option>
    </select>
  `;
  section.append(filterBar);

  // 📦 Grid
  const grid = document.createElement("div");
  grid.className = "grid";
  section.append(grid);

  // 🧩 Initial render
// 🧩 Sort by sn (newest first)
products.sort((a, b) => (b.sn ?? 0) - (a.sn ?? 0));

// 🧩 Initial render
renderProducts(products);
populateCategories(products);

  // 🌐 Firebase Sync
  FBDB.fetch("/")
  .then((fbData) => {
    if (!fbData) return showToast("Offline mode ⚠️", "warning");

    const fbArray = Array.isArray(fbData) ? fbData : Object.values(fbData);
    const cleaned = fbArray.filter(p => p && typeof p === "object");

    // 🧩 Sort by sn descending (latest first)
    cleaned.sort((a, b) => (b.sn ?? 0) - (a.sn ?? 0));

    Storage.set("/", cleaned);
    products = cleaned;

    renderProducts(cleaned);
    populateCategories(cleaned);
    showToast("✅ Synced with Firebase", "success");
  })
  .catch(() => showToast("Offline mode ⚠️", "warning"));

  // 🔎 Filtering logic
  filterBar.addEventListener("input", () => {
    const query = $("#searchInput").value.toLowerCase();
    const selectedCat = $("#categorySelect").value;
    const filtered = products.filter((p) => {
      const nameMatch =
        (p.prodName?.toLowerCase().includes(query) ||
          p.prodModel?.toLowerCase().includes(query)) ?? false;
      const catMatch = selectedCat ? p.prodCategory === selectedCat : true;
      return nameMatch && catMatch;
    });
    renderProducts(filtered);
  });

  // 🧱 Render cards
  function renderProducts(list) {
    grid.innerHTML = "";
    if (!list.length) {
      grid.innerHTML = "<p>No products found.</p>";
      return;
    }

    list.forEach((p, i) => {
      const card = Card({
        title: `${p.prodName || "Unnamed"} (${p.prodModel || "No Model"})`,
        content: `
          <p>💰 <b>Buy:</b> ₹${p.prodRate ?? 0}</p>
          <p>🏷️ <b>Sell:</b> ₹${p.prodCustRate ?? 0}</p>
          <p>📁 <b>Category:</b> ${p.prodCategory || "-"}</p>
          <p>📍 <b>Position:</b> ${p.prodPosition || "-"}</p>

          <div class="qty-control">
            <button class="dec-btn" data-index="${i}">➖</button>
            <span class="qty-value">${p.prodQuantity ?? 0}</span>
            <button class="inc-btn" data-index="${i}">➕</button>
          </div>

          <button class="edit-btn btn mt-2" data-index="${i}">Edit</button>
        `,
      });

      if (p.imageUrl) {
        const img = document.createElement("img");
        img.src = p.imageUrl;
        img.alt = p.prodName || "Product";
        img.className = "product-img";
        card.prepend(img);
      }

      grid.append(card);
    });

    // Bind buttons
    grid.querySelectorAll(".inc-btn").forEach((btn) =>
      btn.addEventListener("click", (e) => updateQuantity(e, 1))
    );
    grid.querySelectorAll(".dec-btn").forEach((btn) =>
      btn.addEventListener("click", (e) => updateQuantity(e, -1))
    );
    grid.querySelectorAll(".edit-btn").forEach((btn) =>
      btn.addEventListener("click", (e) => editProduct(e))
    );
  }

  // ✏️ Edit Product
  function editProduct(e) {
    const index = e.target.dataset.index;
    const selected = products[index];
    if (!selected) return showToast("Product not found!", "error");
    Storage.set("editProduct", selected);
    window.location.hash = "#add-product";
  }

  // ➕➖ Update Quantity
  async function updateQuantity(e, delta) {
  const index = e.target.dataset.index;
  const p = products[index];
  if (!p) return showToast("Product not found", "error");

  p.prodQuantity = Math.max(0, (p.prodQuantity || 0) + delta);
  Storage.set("/", products);

  try {
    // ✅ Use the numeric key (like "100") if exists, otherwise skip
    const id = p.sn || Object.keys(FBDB.cache || {}).find(k => FBDB.cache[k] === p) || null;
    const path = id ? `/${id}` : `/${index}`;

    await FBDB.update(path, { prodQuantity: p.prodQuantity });
    showToast(`${p.prodName} → Qty: ${p.prodQuantity}`, "success");
  } catch (err) {
    console.error(err);
    showToast("Failed to sync with Firebase ⚠️", "warning");
  }

  renderProducts(products);
}

  // 🗂️ Category dropdown
  function populateCategories(list) {
    const select = $("#categorySelect");
    const categories = [...new Set(list.map((p) => p.prodCategory).filter(Boolean))];
    select.innerHTML = `
      <option value="">All Categories</option>
      ${categories.map((c) => `<option value="${c}">${c}</option>`).join("")}
    `;
  }

  return section;
}