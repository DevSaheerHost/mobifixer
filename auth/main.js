import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

// Realtime Database import
import { getDatabase, ref, onChildAdded, onChildChanged, update, query, limitToLast, orderByKey , set }
from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";



const firebaseConfig = {
  apiKey: "AIzaSyAWQP1HENutTN4cPyMM86norOGMSXDnc2g",
  authDomain: "c24o-c038b.firebaseapp.com",
  databaseURL: "https://c24o-c038b-default-rtdb.firebaseio.com",
  projectId: "c24o-c038b",
  storageBucket: "c24o-c038b.firebasestorage.app",
  messagingSenderId: "418015450687",
  appId: "1:418015450687:web:3d0a9632558f242aad4a8a",
  measurementId: "G-X98S86SEV2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Reference to your data
//const itemsRef = ref(db, "service");
const shopRef = ref(db, "shops/")

//==========//

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



import { get, child } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

$('#login').onclick = async (e) => {
  e.preventDefault(); // prevent page reload

  const businessName = $('#login_businessName').value.trim().toLowerCase();
  const businessPass = $('#login_businessPass').value

  if (!businessName || !businessPass) {
    alert("Please enter all fields!");
    return;
  }

  console.log('Attempt login', businessName);

  try {
    const snapshot = await get(child(shopRef, businessName));
    console.log(snapshot.val());

    if (!snapshot.exists()) {
      alert("Shop not found! Please Create new Shop");
      return;
    }

    const shopData = snapshot.val();
    if (shopData.password == businessPass) {
      localStorage.setItem('shopName', businessName)
      location = "/";
    } else {
      alert('Password not match')
    }
  } catch (err) {
    console.error(err);
    alert("❌ Error: " + err.message);
  }
};



$('#signup').onclick = async (e) => {
  e.preventDefault(); // prevent page reload
  const userName = $('#signup_name').value.trim();
  const businessName = $('#signup_businessName').value.trim().toLowerCase();
  const businessEmail = $('#signup_businessEmail').value.trim();
  const businessPass = $('#signup_businessPassword').value.trim();

  if (!userName || !businessName || !businessEmail || !businessPass) {
    alert("Please enter all fields!");
    return;
  }

  console.log('Attempt signup →', businessName);

  try {
    const snapshot = await get(child(shopRef, businessName));

    if (snapshot.exists()) {
      alert("❌ Shop already exists! Please choose a new shop name");
      return;
    }

    // Create new shop entry
    await set(child(shopRef, businessName), {
      owner: userName,
      email: businessEmail,
      password: businessPass, // ⚠️ plaintext — better use hashing
      createdAt: Date.now(),
      service: {} // create empty service branch for future use
    });
    
    localStorage.setItem('shopName', businessName)
    alert("✅ Signup successful! Please login now.");
    location.hash = "#/login";

  } catch (err) {
    console.error(err);
    alert("❌ Error: " + err.message);
  }
};