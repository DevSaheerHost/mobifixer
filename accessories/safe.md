

import { Storage } from "../utils/storage.js";
import { FBDB } from "../utils/fbdb.js";
import showToast from "../ui/toast.js";
import Card from "../components/Card.js";

export default async function Product() {
  let products = Storage.get("products", []);
  if (!Array.isArray(products)) products = Object.values(products || {});

  const section = document.createElement("section");
//section.innerHTML = `<select id="category"></select>`;
document.body.append(section);

// ഇപ്പോൾ DOM-ൽ element ഉണ്ടാകുന്നു
populateCategories();

  // 🧭 Header
  const title = document.createElement("h2");
  title.className = "page-title";
  title.textContent = "Products";
  section.append(title);

  // 🔍 Search & Filter Bar
  const filterBar = document.createElement("div");
  filterBar.className = "filter-bar";
  filterBar.innerHTML = `
    <input type="text" id="searchInput" placeholder="🔍 Search product or model..." />
    <select id="categorySelect">
      <option value="">All Categories</option>
    </select>
  `;
  section.append(filterBar);

  // 📦 Product grid
  const grid = document.createElement("div");
  grid.className = "grid";
  section.append(grid);

  // STEP 1: Render local data instantly
  renderProducts(products);
  populateCategories(products);

  // STEP 2: Firebase sync in background
  FBDB.fetch("products")
    .then((fbData) => {
      if (!fbData) {
        showToast("Offline mode ⚠️", "warning");
        return;
      }

      const fbArray = Array.isArray(fbData) ? fbData : Object.values(fbData);
      Storage.set("products", fbArray);
      showToast("Synced with Firebase ✅", "success");

      renderProducts(fbArray);
      populateCategories(fbArray);
    })
    .catch(() => showToast("Offline mode ⚠️", "warning"));

  // 🎯 Event: Search + Filter combined
  filterBar.addEventListener("input", () => {
    const query = document.querySelector("#searchInput").value.toLowerCase();
    const selectedCat = document.querySelector("#categorySelect").value;
    const filtered = products.filter((p) => {
      const matchSearch =
        (p.name?.toLowerCase().includes(query) ||
          p.modelName?.toLowerCase().includes(query)) ?? false;
      const matchCat = selectedCat ? p.category === selectedCat : true;
      return matchSearch && matchCat;
    });
    renderProducts(filtered);
  });

  return section;

  // 🧩 Render products
  function renderProducts(list) {
    grid.innerHTML = "";
    if (!list.length) {
      grid.innerHTML = "<p>No products found.</p>";
      return;
    }

    list.forEach((p) => {
      const card = Card({
        title: `${p.name || "Unnamed"} (${p.modelName || "No Model"})`,
        content: `
          <p>💰 <b>Buy:</b> ₹${p.price ?? 0}</p>
          <p>🏷️ <b>Sell:</b> ₹${p.sellingPrice ?? 0}</p>
          <p>📦 <b>Qty:</b> ${p.quantity ?? 0}</p>
          <p>📁 <b>Category:</b> ${p.category || "-"}</p>
          <p>📍 <b>Position:</b> ${p.position || "-"}</p>
        `,
      });

      if (p.imageUrl) {
        const img = document.createElement("img");
        img.src = p.imageUrl;
        img.alt = p.name || "Product";
        img.className = "product-img";
        card.prepend(img);
      }

      grid.append(card);
    });
  }

  // 🗂️ Populate category dropdown dynamically
  function populateCategories() {
  const categorySelect = document.querySelector("#category");
  if (!categorySelect) {
    console.warn("⚠️ Category select not found yet.");
    return;
  }

  // add options here
  const categories = ["Display", "Battery", "Motherboard"];
  categorySelect.innerHTML = categories
    .map(c => `<option value="${c}">${c}</option>`)
    .join("");
}
}

















import { Storage } from "../utils/storage.js";
import { FBDB } from "../utils/fbdb.js";
import showToast from "../ui/toast.js";
import Card from "../components/Card.js";

export default async function Product() {
  let products = Storage.get("products", []);
  if (!Array.isArray(products)) products = Object.values(products || {});

  const section = document.createElement("section");
  section.className = "product-page";

  const title = document.createElement("h2");
  title.className = "page-title";
  title.textContent = "Products";
  section.append(title);

  const grid = document.createElement("div");
  grid.className = "grid";
  section.append(grid);

  // 🟢 STEP 1: Render local data instantly
  renderProducts(products);

  // 🟡 STEP 2: Fetch Firebase *in background* (non-blocking)
  FBDB.fetch("products")
    .then((fbData) => {
      if (!fbData) {
        showToast("Offline mode ⚠️", "warning");
        return;
      }

      const fbArray = Array.isArray(fbData) ? fbData : Object.values(fbData);
      Storage.set("products", fbArray);
      showToast("Synced with Firebase ✅", "success");

      // Re-render fresh data
      renderProducts(fbArray);
    })
    .catch(() => showToast("Offline mode ⚠️", "warning"));

  // ✅ local render done — return DOM
  return section;

  // ---- Helper: render cards ----
  function renderProducts(list) {
    grid.innerHTML = "";

    if (!list.length) {
      grid.innerHTML = "<p>No products found.</p>";
      return;
    }
console.log(list)
    list.forEach((p) => {
      
      const card = Card({
        title: `${p?.name || "Unnamed"} (${p?.modelName || "No Model"})`,
        content: `
          <p>💰 <b>Buy:</b> ₹${p.price ?? 0}</p>
          <p>🏷️ <b>Sell:</b> ₹${p.sellingPrice ?? 0}</p>
          <p>📦 <b>Qty:</b> ${p.quantity ?? 0}</p>
          <p>📁 <b>Category:</b> ${p.category || "-"}</p>
          <p>📍 <b>Position:</b> ${p.position || "-"}</p>
        `,
      });

      // 🖼️ Optional product image
      if (p.imageUrl) {
        const img = document.createElement("img");
        img.src = p.imageUrl;
        img.alt = p.name || "Product";
        img.className = "product-img";
        card.prepend(img);
      }

      grid.append(card);
    });
  }
}




import uploadImage from "../utils/cloudinaryUpload.js";
import showToast from "../ui/toast.js";
import { FBDB } from "../utils/fbdb.js";
import { Storage } from "../utils/storage.js";

export default function AddProduct() {
  const container = document.createElement("div");
  container.className = "add-product-page";

  container.innerHTML = `
    <h2 class="page-title">➕ New Product Entry</h2>
    <form id="addProductForm" class="product-form">
      <label>Product Name</label>
      <input type="text" name="name" required>

      <label>Model Name</label>
      <input type="text" name="modelName" required>

      <label>Category</label>
      <input type="text" name="category" placeholder="e.g. Display, Battery, Cover" required>

      <label>Position</label>
      <input type="text" name="position" placeholder="Shelf / Box No.">

      <label>Product Price (₹)</label>
      <input type="number" name="price" required>

      <label>Selling Price (₹)</label>
      <input type="number" name="sellingPrice" required>

      <label>Quantity</label>
      <input type="number" name="quantity" min="1" value="1" required>

      <label>Product Image (optional)</label>
      <input type="file" name="image" accept="image/*">

      <button type="submit" class="submit-btn">Save Product</button>
    </form>
  `;

  // --- Handle Form Submit ---
  const form = container.querySelector("#addProductForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const product = Object.fromEntries(formData.entries());

    try {
      // Upload image if exists
      if (formData.get("image") && formData.get("image").size > 0) {
        showToast("Uploading image...", "info");
        const imgUrl = await uploadImage(formData.get("image"));
        product.imageUrl = imgUrl;
      }

      // Convert numeric fields
      product.price = Number(product.price);
      product.sellingPrice = Number(product.sellingPrice);
      product.quantity = Number(product.quantity);
      product.createdAt = new Date().toISOString();

      // 🧠 Get existing local data
      let products = Storage.get("products", []);
      if (!Array.isArray(products)) products = Object.values(products || {});

      // Add new product
      const updatedProducts = [...products, product];
      Storage.set("products", updatedProducts);

      // 🔥 Save to Firebase (Realtime Database)
      const success = await FBDB.save("products", updatedProducts);

      if (success) {
        showToast("✅ Product added & synced to Firebase!", "success");
      } else {
        showToast("⚠️ Saved locally (offline mode).", "warning");
      }

      form.reset();
    } catch (error) {
      console.error("❌ Error saving product:", error);
      showToast("Error adding product!", "error");
    }
  });

  return container;
}