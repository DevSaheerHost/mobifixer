export default function Header() {
  const header = document.createElement("header");
  header.className = "header";
  header.innerHTML = `
    <h1>MobiFixer ACCESSORIES</h1>
    <nav>
      <a href="#home">Home</a>
      <a href="#about">About</a>
      <a href="#product">Product</a>
      <a href="#add-product">Add Product</a>
    </nav>
  `;
  return header;
}