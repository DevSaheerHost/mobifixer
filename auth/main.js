import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

// Realtime Database import
import { getDatabase, ref, onChildAdded, onChildChanged, update, query, limitToLast, orderByKey , set }
from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";


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
const auth = getAuth(app);

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
    case "#/reset":
      target = $("#reset-page");
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

// $('.logo').onclick = async (e) => {
//   e.preventDefault();
//   const email = $('#login_businessName').value.trim(); // <-- here use email instead of name
//   const password = $('#login_businessPass').value.trim();

//   if (!email || !password) {
//     alert("Please enter all fields!");
//     return;
//   }

//   $('.loader').classList.remove('hidden');

//   try {
//     const userCredential = await signInWithEmailAndPassword(auth, email, password);
//     const user = userCredential.user;

//     localStorage.setItem('uid', user.uid);
//     localStorage.setItem('shopEmail', user.email);
//     alert("✅ Login successful!");
//     location = "/";
//   } catch (err) {
//     console.error(err);
//     alert("❌ Login failed: " + err.message);
//   } finally {
//     $('.loader').classList.add('hidden');
//   }
// };


$('#login').onclick = async (e) => {
  e.preventDefault();

  const identifier = $('#login_businessName').value.trim().toLowerCase();
  const password = $('#login_businessPass').value.trim();

  if (!identifier || !password) {
    alert("Please enter all fields!");
    return;
  }

  $('.loader').classList.remove('hidden');

  try {
    const snapshot = await get(child(shopRef, identifier));

    if (!snapshot.exists()) {
      alert("❌ Shop not found!");
      return;
    }

    const shopData = snapshot.val();

    // 🧩 Case 1: Old user (plaintext password in DB)
    if (shopData.password) {
      if (String(shopData.password) === String(password)) {
        try {
          // 🔁 Attempt migration to Firebase Auth (if not yet)
          const userCredential = await createUserWithEmailAndPassword(auth, shopData.email, shopData.password);
          const user = userCredential.user;

          await update(child(shopRef, identifier), { uid: user.uid, password: null });
          alert("🔁 Account migrated successfully!");
        } catch (err) {
          if (err.code === "auth/email-already-in-use") {
            // Already migrated earlier — just login
            const userCredential = await signInWithEmailAndPassword(auth, shopData.email, password);
            const user = userCredential.user;
            await update(child(shopRef, identifier), { uid: user.uid, password: null });
            alert("✅ Logged in (Migrated Account)");
          } else {
            console.error(err);
            alert("❌ Migration/Login Error: " + err.message);
          }
        }

        localStorage.setItem('shopName', identifier);
        location = "/";
      } else {
        alert("❌ Incorrect password");
      }
    }

    // 🧩 Case 2: Already migrated Firebase user (no password in DB)
    else if (shopData.owner.email) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, shopData.owner.email, password);
        const user = userCredential.user;
        localStorage.setItem('shopName', identifier);
        localStorage.setItem('uid', user.uid);
        alert("✅ Logged in (FB Account)");
        location = "/";
      } catch (err) {
        if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
          alert("❌ Wrong password!");
        } else {
          alert("❌ Login failed: " + err.message);
        }
      }
    } else {
      alert("⚠️ Shop found, but no valid login data!");
    }
  } catch (err) {
    console.error(err);
    alert("❌ Error: " + err.message);
  } finally {
    $('.loader').classList.add('hidden');
  }
};


// 🔐 Forgot password → send Firebase reset email to the shop's registered email
$('#reset-btn').onclick = async (e) => {
  e.preventDefault();

  const identifier = $('#reset_businessName').value.trim().toLowerCase();

  if (!identifier) {
    alert("Please enter your Business Name.");
    return;
  }

  $('.loader').classList.remove('hidden');

  try {
    const snapshot = await get(child(shopRef, identifier));

    if (!snapshot.exists()) {
      alert("❌ Shop not found! Check the business name and try again.");
      return;
    }

    const shopData = snapshot.val();
    // Login uses Firebase Auth; the email lives on the shop record.
    const email = shopData?.owner?.email || shopData?.email;

    if (!email) {
      alert("⚠️ No email is registered for this shop, so a reset link can't be sent. Please contact support.");
      return;
    }

    // ⚠️ Firebase (with Email Enumeration Protection, on by default) resolves
    // sendPasswordResetEmail successfully even when the email has NO Auth account,
    // so it would silently claim "sent" and no mail arrives. Legacy shops keep a
    // plaintext password in the DB and only get a Firebase Auth account after their
    // first login (migration). Detect that here and give honest guidance instead.
    const hasAuthAccount = !!(shopData?.owner?.uid || shopData?.uid);
    const legacyPlaintext = typeof shopData?.password === 'string' && shopData.password.length > 0;

    if (!hasAuthAccount || legacyPlaintext) {
      alert("⚠️ This shop isn't linked to email login yet, so no reset email can be sent.\n\nPlease log in ONCE with your current password (that activates email login), then use Forgot Password. If you don't remember the password, contact support.");
      return;
    }

    await sendPasswordResetEmail(auth, email);

    // mask the email a little for privacy
    const [user, domain] = email.split('@');
    const masked = `${user.slice(0, 2)}***@${domain || ''}`;
    alert(`✅ If an account exists for ${masked}, a password reset link has been sent. Check your inbox and spam folder.`);
    location.hash = "#/login";

  } catch (err) {
    console.error(err);
    if (err.code === "auth/user-not-found") {
      alert("⚠️ This shop hasn't been activated for password reset yet. Please log in once with your current password first, then try again.");
    } else if (err.code === "auth/invalid-email") {
      alert("❌ The email on record is invalid. Please contact support.");
    } else if (err.code === "auth/too-many-requests") {
      alert("⚠️ Too many attempts. Please wait a few minutes and try again.");
    } else {
      alert("❌ Error: " + err.message);
    }
  } finally {
    $('.loader').classList.add('hidden');
  }
};


$('#signup').onclick = async (e) => {
  e.preventDefault();
  const userName = $('#signup_name').value.trim();
  const businessName = $('#signup_businessName').value.trim().toLowerCase();
  const businessEmail = $('#signup_businessEmail').value.trim();
  const businessPass = $('#signup_businessPassword').value.trim();

  if (!userName || !businessName || !businessEmail || !businessPass) {
    alert("Please enter all fields!");
    return;
  }

  $('.loader').classList.remove('hidden');

  try {
    // 1️⃣ Create Firebase auth user
    const userCredential = await createUserWithEmailAndPassword(auth, businessEmail, businessPass);
    const user = userCredential.user;

const existing = await get(child(shopRef, businessName));
if (existing.exists()) {
  alert("❌ This business name is already taken. Please choose another.");
  return;
}

    // 2️⃣ Save shop details (no password)
    await set(child(shopRef, businessName), {
      shop: businessName,
      owner:{
        name: userName,
        email: businessEmail,
        uid: user.uid,
        createdAt: Date.now()
      },
      lastServiceSn: 0,
      service: {},
      staff:{}
    });

    localStorage.setItem('shopName', businessName);
    localStorage.setItem('author', userName);
    localStorage.setItem('role', 'Shop Owner');
    
    alert("✅ Signup successful!");
    location.hash = "#/login";
  } catch (err) {
    console.error(err);
    alert("❌ Error: " + err.message);
  } finally {
    $('.loader').classList.add('hidden');
  }
};






const provider = new GoogleAuthProvider();

$('#google-login').onclick = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const businessName = user.email.split('@')[0].toLowerCase();
    const snapshot = await get(child(shopRef, businessName));

    if (!snapshot.exists()) {
      await set(child(shopRef, businessName), {
        shop: businessName,
        owner: user.displayName || 'Unknown',
        email: user.email,
        uid: user.uid,
        createdAt: Date.now(),
        lastServiceSn: 0,
        service: {}
      });
    }

    localStorage.setItem('shopName', businessName);
    alert(`✅ Welcome ${user.displayName || 'User'}!`);
    location = "/";
  } catch (err) {
    console.error(err);
    alert("❌ Google Sign-in Error: " + err.message);
  }
};