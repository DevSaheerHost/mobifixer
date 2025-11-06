import Header from "./components/Header.js";
import Footer from "./components/Footer.js";
import router from "./utils/router.js";

export default async function App() {
  const app = document.querySelector("#app");
  
  app.innerHTML = ""; // clear before render
  
  app.append(Header());
  
  // ✅ Wait for router to finish (since router() is async)
  const main = await router();
  app.append(main);
  
  app.append(Footer());
}