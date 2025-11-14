import uploadImage from "../utils/cloudinaryUpload.js";
import showToast from "../ui/toast.js";
import { FBDB } from "../utils/fbdb.js";
import { Storage } from "../utils/storage.js";
import Button from "../ui/Button.js";


export default function AddProduct() {
  const container = document.createElement("div");
  container.className = "add-product-page";

  const editData = Storage.get("editProduct", null);
  const isEditMode = !!editData;
  
  

  container.innerHTML = `
    <h2 class="page-title">${isEditMode ? "✏️ Edit Product" : "➕ New Product Entry"}</h2>
    <form id="addProductForm" class="product-form">
      <label>Product Name</label>
      <input type="text" name="prodName" value="${editData?.prodName || ""}" required>

      <label>Model Name</label>
      <input type="text" name="prodModel" value="${editData?.prodModel || ""}" required>

      <label>Category</label>
      <input type="text" name="prodCategory" value="${editData?.prodCategory || ""}" required>

      <label>Position</label>
      <input type="text" name="prodPosition" value="${editData?.prodPosition || ""}">

      <label>Product Price (₹)</label>
      <input type="number" name="prodRate" value="${editData?.prodRate || ""}" required>

      <label>Selling Price (₹)</label>
      <input type="text" name="prodCustRate" value="${editData?.prodCustRate || ""}" required>

      <label>Quantity</label>
      <input type="number" name="prodQuantity" min="1" value="${editData?.prodQuantity || 1}" required>

      <label>Product Image (optional)</label>
      <input type="file" name="image" accept="image/*">

      ${isEditMode && editData.imageUrl ? `<img src="${editData.imageUrl}" class="preview">` : ""}

      <button type="submit" class="submit-btn">${isEditMode ? "Update Product" : "Save Product"}</button>

    </form>
  `;
  

  const form = container.querySelector("#addProductForm");
  
  const cancelBtn = document.createElement("button");
cancelBtn.textContent = isEditMode?'Cancel Update':'Cancel';
cancelBtn.className = "cancel-btn";
cancelBtn.type='button'
cancelBtn.addEventListener("click", () => {
  //alert('c')
  Storage.remove("editProduct");
  window.location.hash = "#/products";
});

form.appendChild(cancelBtn);


  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const product = Object.fromEntries(formData.entries());

    try {
      if (formData.get("image") && formData.get("image").size > 0) {
        showToast("Uploading image...", "info");
        const imgUrl = await uploadImage(formData.get("image"));
        product.imageUrl = imgUrl;
      } else if (editData?.imageUrl) {
        product.imageUrl = editData.imageUrl;
      }

      // 🧮 Convert numeric values
      product.prodRate = Number(product.prodRate);
      product.prodCustRate = Number(product.prodCustRate);
      product.prodQuantity = Number(product.prodQuantity);
      product.createdAt = editData?.createdAt || new Date().toISOString();

      // 🔢 Load existing products
      let products = Storage.get("/", []);

      if (!Array.isArray(products)) products = Object.values(products || {});

if (isEditMode) {
  // Edit mode: retain same id
  const index = products.findIndex((p) => p.sn === editData.sn);
  if (index >= 0) {
    product.sn = editData.sn;
    products[index] = product;
  }
  showToast("Product updated successfully", "success");
} else {
  // Add mode: generate unique incremental ID
  const maxId = products.length
    ? Math.max(...products.map((p) => Number(p.sn) || 0))
    : 0;
  const newId = maxId + 1;
  product.sn = newId;
  products.push(product);
  showToast("Product added successfully", "success");
}

      // 💾 Save locally
      Storage.set("/", products);

      // ☁️ Save to Firebase (structured by id)
      // ✅ Convert all keys to string — Firebase requires string paths
const fbData = {};
products.forEach((p, i) => {
  if (!p || typeof p !== "object") return; // 🧩 skip invalid/null
  fbData[String(p?.sn ?? i)] = p;
});

// 🧩 Clean invalid/null entries before push
Object.keys(fbData).forEach((k) => {
  if (!fbData[k] || typeof fbData[k] !== "object") delete fbData[k];
});

// 🌐 Save to Firebase safely
// ☁️ Save to Firebase safely
try {
  const cleanData = JSON.parse(JSON.stringify(fbData));
  await FBDB.save("/", cleanData);
  console.log("✅ Firebase sync successful:", cleanData);
} catch (e) {
  console.error("❌ Firebase save failed:", e);
  showToast("❌ Firebase save failed!", "error");
}

      Storage.remove("editProduct");
      form.reset();

      setTimeout(() => (window.location.hash = "#/products"), 800);
    } catch (err) {
      console.error(err);
      showToast("❌ Error saving product!", "error");
    }
  });

  return container;
}