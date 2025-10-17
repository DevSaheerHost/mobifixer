# 📌 Changelog




##  🚧 [Unreleased]

---

## [4.5.4] - 2025-10-17
### ✨ Features
- Implemented full functionality for the previously created Pouch Search page.
- Added real-time inventory synchronization using Firebase listeners (onValue / onChildChanged).
- Updated increase/decrease quantity buttons to instantly reflect changes in UI and database.
- Search results now always display latest stock quantity without requiring page refresh.


### ⚙️ Improvements
- Optimized stockData handling for live updates.
- Improved DOM update logic for smoother user experience in search results.


### 🧩 Developer Notes
- stockData now stays live-synced with Firebase.
- Refactored search logic to prioritize updated data over cached copies.

## [4.5.0] - 2025-10-15
### Features
- 🔹 Added support for multiple devices per service entry, including model, complaints, and lock fields.
- 🔹 Dynamic input generation for additional devices (up to 5), with separate fields for name, complaint, and lock.
- 🔹 Edit functionality now loads all device data from devices[], including lock, for seamless updates.
- 🔹 Stored all devices in service/devices array while keeping backward compatibility for old single-device structure.



### UI/UX
- 🔹 Updated cardLayout to display all devices with model, complaint, and lock.
- 🔹 Updated searchCard to support devices array and show each device separately.
- 🔹 Added suggestions/autocomplete for model and complaints fields, supporting both old and new data structures.



### Search & Filter
- 🔹 Updated filtering logic to handle multi-device structure (devices[]) for model search.
- 🔹 Ensured complaint filtering works for both old structure (complaints) and new structure (devices[].complaints).


### Bug Fixes
- 🔹 Preserved input values while increasing device count dynamically (previously cleared on each increment).
- 🔹 Fallbacks implemented for missing lock, model, or complaints in old structure.



## [4.4.0] - 2025-10-14
- Added Theme customisation 
- control sounds and notification (also voice)
- UI fixes
- stability improve 

## ⚙️ 4.3.0 — Settings Page Introduced

### ✨ New Features
- Added a brand-new **Settings page** for better personalization and control  
- Included **Profile Overview** with name, email, and shop summary  
- Added **Quick Stats cards** showing total entries, today’s entries, and available spares  
- Introduced **toggle controls** (e.g., Light Mode, Notifications) with smooth animations  
- Basic **navigation routing** for sub-pages (`#settings/profile`, `#settings/shop`, etc.)  

### 🎨 UI Enhancements
- Glass-style interface aligned with new Mobifixer theme  
- Improved section grouping with clean spacing and icons  
- Responsive layout optimized for mobile and tablet view  

### 🧩 Code Improvements
- Modular route handling for hash-based navigation  
- Universal toggle system supporting multiple switches  
- LocalStorage support for theme persistence (Light/Dark mode)

### 🧠 Developer Note
This update lays the foundation for upcoming settings options like:
Backup & Restore, Export Data, Notification preferences, and About Mobifixer page.


---



## [4.0.0] - 2025-10-11
### 🎨 UI / Theme Overhaul
- ✨ Introduced a complete glassmorphism theme with layered transparency and subtle blur effects.
- 🌌 New dark base palette built around #0d1117 and #161b22 for a modern, professional aesthetic.
- 🧊 Updated cards, modals, and containers to use translucent backgrounds (rgba(255, 255, 255, 0.06)) with dynamic hover states.
- 💡 Text colors rebalanced:
  - Primary text: #e6edf3
  - Muted text: #8b949e
  - Headings: pure white #ffffff for strong contrast
- 🧠 Added accent highlights using #0ba2ff and #0088d8 for focus and interactivity.
- 🧯 Refined danger and success tones:
  - Error: #ff3b3b
  - Success: #00c36a
- 🪩 Added glass gradient layer (--accent-glass) to enhance depth and realism across UI components.


---


### 🧰 Structural / CSS Improvements
- 🪶 Unified all background variables under :root for easier theme management.
- 🔁 Replaced hard-coded colors with new CSS variables for maintainability and scalability.
- 🧩 Improved hover transitions for cards, buttons, and input elements.


---


### ⚙️ Performance & UX
- ⚡ Reduced CSS redundancy → smaller stylesheet footprint.
- 🧭 Improved UI clarity and visual hierarchy for better readability in dark environments.


---


### 📈 Version Note
> This update marks a major design evolution for Mobifixer — focusing on elegance, readability, and a futuristic interface built around the glass aesthetic.


---


## [3.5.1] - 2025-10-10
- UI Enhanced 
- security Added
- Bug Fixes 

## [3.5.0] - 2025-10-09
### 🎨 UI Enhancements
- inventory form function created
- clean UI created for Inventory management
- new UI looks implemented 


---

## [3.4.0] - 2025-10-07
### 🎨 UI Enhancements
- Styled select element with modern flat design and custom arrow
- Improved visibility and focus states for better user interaction
- Added responsive layout for status control section (select + button)
- bug fixes 
- Stability improvement's 

### 🚀 Improvements

- Refactored name suggestion system with unique filtering for better scalability
- Prepared codebase for future enhancements like real-time database lookup and keyboard navigation
- Improved maintainability and readability for future expansion of suggestion features


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