const $ = s => document.querySelector(s);

let lastHash = location.hash;
let direction = "forward"; // default

window.addEventListener("popstate", () => {
  // back pressed
  direction = "backward";
});

const router = () => {
  const pages = document.querySelectorAll("main");
  pages.forEach(m => m.classList.add('hidden'));

  let target;
  switch (location.hash) {
    case "#/login":
      target = $("#login-page");
      break;
    case "#/signup":
      target = $("#signup-page");
      break;
    default:
      target = $("#home-page");
  }

  // apply animation
  
  target.classList.remove('hidden')
  

  lastHash = location.hash;
  direction = "forward"; // reset
};

window.addEventListener("hashchange", router);
router();

$(".get-started-btn").onclick = () => (location.hash = "#/login");

