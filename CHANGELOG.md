# 📘 Changelog

All notable changes to this project will be documented in this file.  
This changelog follows the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format,  
and adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---


## 🚧 [Unreleased]

### TODO 📝
- ROLE BASED ACCES 
- LOGIN INCLUDED USER NAME ALSE FOR CHECK AUTHOR OR STAFF FOR ROLES 
- create tab setup for switch page between**Service page and credit page**
- Create a page to display **yesterday’s credit information** at today’s app opening time (Reminder of Previous days Task )
- Restructure the database schema to support *multiple users* and improve scalability
- Create About Page
- Enhance the Theme Page UI UX (Function also)
- Add storage information (offline and onlide)
- Make user authentication is strict for data leakage safety
- Add data encryption for data safety


---


# CREATED CASHBOOK APP [2025-11-8]

## [5.0.0] - 2025-11-17
### 🎉 MAJOR UPDATE - Shop Management & Theme System

### ✨ New Features
- **Shop Details Page** - Complete shop information display with animated header and professional layout
- **Edit Shop Details Modal** - Update shop information with comprehensive form validation
- **Professional Theme Customization UI** - 4 preset themes + custom color picker with live preview
- **Custom Theme Controls** - Fine-tune opacity, blur effects, border radius
- **Enhanced Settings Page** - Improved UI with better visual hierarchy and descriptions
- **About/Changelog Page** - Redesigned with creator info, tech stack, and features
- **Backup & Restore Options** - Complete backup functionality interface (ready for implementation)
- **Operating Hours Management** - Set and display shop operating hours

### 🔧 Improvements
- Form validation system (email, phone, required fields)
- Glass morphism UI enhancements across all pages
- Smooth animations and transitions for better UX
- Better responsive design for mobile (480px), tablet (768px), and desktop
- Shop statistics dashboard with colorful stat cards
- Professional gradient backgrounds and color schemes
- Improved visual feedback for all interactive elements
- Enhanced icon usage with Font Awesome v7.0.1

### 🐛 Bug Fixes
- Fixed class name preservation in settings page (JS compatibility)
- Improved form field focus states with accent color highlights
- Fixed modal animations and transitions
- Better error handling and validation messages
- Resolved responsive layout issues on small screens

### 📱 Responsive Updates
- Mobile optimization with touch-friendly buttons and inputs
- Tablet optimization with adjusted spacing and layouts
- Desktop enhancement with full-width layouts
- Improved form field sizing for all screen sizes
- Better modal behavior on mobile devices

### 🎨 Design Updates
- New color schemes for 4 theme presets (Mobifixer Dark, Natural Day, Dark Compat, Developer Mode)
- Enhanced typography hierarchy with better font weights
- Professional layout improvements with better spacing
- Smooth hover effects and transitions
- Improved contrast and accessibility

### 🗄️ Code Changes
- Added shop details page component with statistics
- Implemented edit shop details modal with form handling
- Created theme customization UI with color/range inputs
- Enhanced localStorage integration for shop data persistence
- Added comprehensive form validation functions
- Improved page routing with shop-details hash route

### 📖 Documentation
- Added JSDoc comments for new functions
- Included validation rules documentation
- Added Firebase integration notes for future updates

### ⚡ Performance
- Optimized modal rendering with lazy loading
- Improved form input responsiveness
- Better CSS selector performance
- Reduced unnecessary re-renders

### 🔜 Next Steps / TODO
- Firebase integration for shop details persistence
- Cloud backup and restore functionality
- Export data to Excel/PDF
- Theme persistence across devices via Firebase
- Customer feedback system
- Advanced analytics dashboard

---


# CREATED CASHBOOK APP [2025-11-8]

## [4.8.9] - 2025-11-7
### 🧩 Fixes
- 🧮 Numeric Conversion: Fixed an issue where product quantity (prodQuantity) was treated as a string, causing incorrect increments like “1 → 11”.
- ✅ Added explicit conversion using Number(p.prodQuantity) to ensure proper arithmetic behavior.
- 🔒 Prevented negative values with Math.max(0, …) safeguard.


### ⚙️ Code Improvement
- Refined quantity update logic for cleaner, more predictable updates across both local storage and Firebase.
- Improved data consistency by ensuring all quantity values are stored as numbers.



### 🧠 Result
- Increment/decrement buttons now work flawlessly.
- Quantities remain consistent across UI, local cache, and remote sync.
- Zero or negative values are safely handled.



---


## [4.8.7] - 2025-11-07
### 🚀 New Features
#### 📱 Separate Accessories App
- Created a standalone Accessories management app for smoother operation and independent handling.  
- Full product management: add, edit, delete, and view accessories inventory.  
- Integrated Firebase support for real-time sync with main system.  

### 🧩 Improvements
- Streamlined codebase by splitting accessories-related logic from the main Mobifixer app.  
- Enhanced modularity — easier maintenance and feature expansion in future updates.  
- UI components restructured for consistent design across both apps.  

### 🐞 Fixes
- Fixed minor database reference conflicts during app split.  
- Resolved caching issue where accessories data appeared under main product list.  

### 📦 Notes
- **Mobifixer** and **Accessories** apps now operate as two distinct modules under the same ecosystem.  
- Sync and user authentication remain unified for both apps.  


----



## [4.8.0] - 2025-11-6
### Stability Improvements
#### ✅ Crash fix:
  - Prevented “Cannot read properties of null (reading 'sn')” error during initial load.
  - All invalid or incomplete records are now filtered automatically.

####  ⚙️ Safe fallback:
  - `Local data not found? App will gracefully show
“No local data found” message instead of breaking.`


### 🧩 Developer Enhancements
#### 💾 Local data validation:
  - Ensures each record has sn property before rendering.
  - Protects createCards() from invalid input.


### 🌐 Performance
- App startup time reduced by ~70% on repeated loads (thanks to cached local data).
- No unnecessary re-renders while waiting for Firebase updates.

---


## [4.7.6] - 2025-10-31
- Enhanced customer card for better readability.
- bug fixes
- security improvement.
- stability improvement 
---


## [4.7.5] - 2025-10-29
### ✨ UI Enhancements
- Improved card visual hierarchy (device info → payment info → notes → actions).
- Add avatar or initials for each customer entry.


### 🧠 UX Improvements
- Introduced logical grouping of financial data for clear readability.


### ⚡ Performance & Readability
- Optimized rendering of service cards for smoother scrolling.
- Fine-tuned padding and shadow depth for clarity on dark background.
- search filter improved with model name in inventory management 


### 🪲 Bug fixes 
- App close and open reload fixed
---



## [4.7.0] - 2025-10-28
### 🔐 Authentication
- ✨ Added Firebase Email/Password Authentication for secure user login.
- 🧠 Integrated createUserWithEmailAndPassword() for registration flow.
- 🔁 Linked newly created Firebase user UID to corresponding shop data node.
- 🧹 Automatically removed plaintext password from stored data after registration.
- ⚠️ Added validation to prevent duplicate email registration attempts.
- 🚫 Added fallback alert when an existing email tries to sign up again.
- 👋 Added personalized welcome notice on successful login.



---



### 🧩 Data Management
- 🧭 Synced Firebase Auth UID with shops/{shopName}/staff node.
- 📅 Planned support for tracking last login date for staff users (next build).



---


### 💅 UI/UX
- 🔔 Added dynamic toast notifications (showNotice) for login feedback.
- 🎨 Improved name input validation and role selection UX.


---

### fix(service-edit): preserve original date/time when editing
- Prevented loss of timestamps on data edit
- Added snapshot fetch to keep immutable fields
- Improved UX feedback for edit operation



---



## [4.6.0] - 2025-10-17
### ✨ New Feature
- Added a Bottom Sheet UI component for contextual actions Includes smooth slide-up animation and blurred overlay background
- Supports click-outside-to-close and “X” button for dismissing
- Designed for mobile-first usability and consistent app-wide UX
- Prepared structure for future drag-down gesture support


---


### 💄 UI / UX
- Enhanced modal depth with shadow and blur overlay for better focus
- Unified button styling (.add_customer) within bottom sheet
- Improved accessibility with logical z-index layering and transitions




---


### Enhancements 🚀
- Enhance the **information page UX** for better readability
- Implement new **Font family**  (Poppins)




---


### Added ✨ 
- Created Backup & Restore Page (user can see storage usage)
- Impliment the storage information (to monitor data)

---


### Bug fixes 
- Removed unnecessary alerts


---


## [4.5.4] - 2025-10-17
### ✨ Features
- Implemented full functionality for the previously created Pouch Search page.
- Added real-time inventory synchronization using Firebase listeners (onValue / onChildChanged).
- Updated increase/decrease quantity buttons to instantly reflect changes in UI and database.
- Search results now always display latest stock quantity without requiring page refresh.
- UX optimization 
- Minor bug fixes


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