// utils/fbdb.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, get, set, update, child } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD0_Y0WC1OwctqV_mc2oUgF-BqNzfhPZEU",
  authDomain: "webs-a3a98.firebaseapp.com",
  databaseURL: "https://webs-a3a98-default-rtdb.firebaseio.com/", // 🧩 Add this line
  projectId: "webs-a3a98",
  storageBucket: "webs-a3a98.appspot.com", // ✅ Correct domain
  messagingSenderId: "799350695421",
  appId: "1:799350695421:web:1dda7e9c7ddddf8839e594",
  measurementId: "G-BYX5NY1KK3"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export const FBDB = {
  async fetch(path) {
    try {
      const snapshot = await get(child(ref(db), path));
      return snapshot.exists() ? snapshot.val() : [];
    } catch (err) {
      console.error("Firebase fetch failed", err);
      return null;
    }
  },

  async save(path, data) {
    try {
      await set(ref(db, path), data);
      return true;
    } catch (err) {
      console.error("Firebase save failed", err);
      return false;
    }
  },

  // 🆕 Add this 👇
  async update(path, data) {
    try {
      await update(ref(db, path), data);
      return true;
    } catch (err) {
      console.error("Firebase update failed", err);
      return false;
    }
  },
};