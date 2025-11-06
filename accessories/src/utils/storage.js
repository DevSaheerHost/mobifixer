export const Storage = {
  get(key, fallback = []) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
      return fallback;
    }
  },
  set(key, data) {
    key ? localStorage.setItem(key, JSON.stringify(data)) : console.log("no dataaa");
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.warn("⚠️ Failed to remove key:", key, err);
    }
  },
};