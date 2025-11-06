// utils/router.js
import Home from "../pages/Home.js";
import About from "../pages/About.js";
import Product from "../pages/Product.js";
import AddProduct from "../pages/AddProduct.js";

export default async function router() {
  const route = location.hash.replace("#", "") || "home";
  const main = document.createElement("main");

  switch (route) {
    case "about": {
      const html = About();
      main.append( await html);
      break;
    }
    case "product": {
     // const html = await Product(); // ✅ wait for async
      main.append( await Product());
      break;
    }
    case "add-product": {
      const html = AddProduct();
      main.append(html);
      break;
    }
    default: {
      const html = Home();
      main.append(html);
      break;
    }
  }

  return main;
}