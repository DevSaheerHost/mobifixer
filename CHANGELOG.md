# 📌 Changelog




##  🚧 [Unreleased]

---

## [3.3.3] - 2025-10-07
- author name added
- Stability Improved

---

## [3.3.2] - 2025-10-07
- Accessibility Improvements.
- UI fixes
- install app option with meta tag. in web.
- User Experience Improved
- time added for new data



---


## [3.3.1] - 2025-10-06
- Bug fixes
- performance improvements
- FIXED status issue when add new data

## [3.3.0] - 2025-10-05
### ⚙️ Backup System
- 🔄 Added real-time backup comparison between **Cloud** data and **LocalStorage backup**
- 🧠 Implemented auto sync logic:
 - - If localStorage.service.length < cloud.service.length → update local backup
  - - If localStorage.service.length > cloud.service.length → trigger error (possible data loss or tampering)
  - - If equal → skip update (already synced)

### 🛡️ Security & Integrity
- 🚫 Prevents overwriting backup when data loss is detected
- 🧩 Safe handling of Cloud object-to-array conversion using Object.values()
- 🧱 Added try/catch and structured error notifications for reliability

### 💬 UI / Feedback
- ✅ Added dynamic notifications via showNotice()
- info: Backup synced successfully
- warn: No data found
- error: Data loss detected or fetch failed

---

## [3.2.1] - 2025-10-05
- **Fixed** call button function
- **UI** Animation enhanced 
- 🪲 Minor Bug fixes
- Performance Improved


---

## [3.2.0] - 2025-10-04
### 🚀 Features
- Added **Edit Option** for existing service entries
- Enabled auto-fill form for quick editing experience
- Introduced new **zoom in zoom out animation** from bottom-right corner
- Enhanced transition effects for buttons and components

### 🎨 UI/UX
- Improved **animation smoothness** using transform scaling
- Added subtle fade-in and morph effects for better visual feedback
- Unified color and motion consistency across pages
- Enhanced interaction feel using short vibration patterns
- Synchronized notice animation with vibration pulse for realistic feedback

### 🛠️ Fixes & Improvements
- Fixed minor form validation delays during edit mode
- Optimized button interactions and notice timing
- General performance and responsiveness improvements

### 🔔 Notifications
- Added vibration feedback for all notice alerts (success, error, info)
- Improved tactile response timing for better user feedback

### ⚙️ Technical
- Implemented navigator.vibrate() API with pattern-based feedback
- Optimized vibration trigger to occur only on user-initiated actions

### ✨ Inventory
- 🆕 Designed **Add Inventory Page** with input fields:  
  - Product name  
  - Product model  
  - Category  
  - (and more details)
- ⏳ Loading animation in progress  
- 🛠️ Add new inventory items & organize stock efficiently  

---

## [3.0.1] - 2025-10-03  
- 🐞 Minor bug fixes  
- 📦 Initial **Inventory Page** created  
- 🔧 Stability improvements  

---

## [3.0.0] - 2025-10-03  
### ✨ Authentication System  
- 🔑 Added **signup & login** with Firebase Realtime DB  
- ✅ Implemented login validation (shop existence check under `shops/`)  
- 🆕 Added signup with duplicate shop name check  
- 📂 New shops now include: owner, email, password, createdAt, and service branch  

### 🔄 UI & Functionality  
- ⚡ Integrated hash-routing redirect after successful login/signup  
- 📝 Improved form validation & error handling  
- 🎨 UI improvements & refinements  
- 🐞 Multiple bug fixes  

---

## [2.6.0] - 2025-10-02  
- 🔧 Backend updated for **multi-shop support**  
- 📊 Scaled data handling for performance  
- 🎨 UI fixes & improvements  
- ⏫ Data sorted by **newest first**  
- 🔔 Improved notification UI  

---

## [2.0.1] - 2025-10-02  
- 🎨 Auto page redesigned  
- 🔍 Improved search results  
- 📝 Added more details in customer card  
- 💰 Added new input fields: **advance amount** & **approx amount**  

---

## [2.0.0] - 2025-10-01  
### ✨ Major Feature Update  
- 💰 Advance & Approx amount fields added  
- 📝 More detailed customer info fields  
- 🔍 Fixed search function error  
- 🎨 Revamped UI (buttons, cards, layout)  
- 🐞 Minor bug fixes  
- 🔎 Improved search results & detail cards  

---

## [1.2.1]  
- 🎨 New design for "Add Customer" button on Home screen  
- 🌀 Animated button on scroll  

---

## [1.2.0]  
- 🎨 Implemented new **main interface layout**  
- ⏳ Added time-progress indicator for notifications  
- 📝 Added input field for creating notes