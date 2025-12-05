// WARNING: REPLACE THE PLACEHOLDERS BELOW WITH YOUR ACTUAL CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyA1-TlKQKX1PeCC2vxYiz8o-KWWKMpyRCs",
  authDomain: "yout-54ac2.firebaseapp.com",
  databaseURL: "https://yout-54ac2-default-rtdb.firebaseio.com",
  projectId: "yout-54ac2",
  storageBucket: "yout-54ac2.firebasestorage.app",
  messagingSenderId: "343599912670",
  appId: "1:343599912670:web:0d51ba858c185447e8144f"
};



// --- UTILITY FUNCTION: Get today's date in DD-MM-YYYY format ---
function getTodayDate() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = today.getFullYear();
    return `${day}-${month}-${year}`; // DD-MM-YYYY format
}

//document.querySelector('.submit-button').onclick=()=>orderForm.submit()
// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    console.log("Firebase Initialized.");

    // DOM Elements
    const orderForm = document.getElementById('orderForm');
    const ordersList = document.getElementById('ordersList');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const statusMessage = document.getElementById('statusMessage');

    // --- FUNCTION 1: ADD NEW ORDER ---
    document.querySelector('.submit-button').addEventListener('click', async (e) => {
        e.preventDefault();

        // Get values from the form inputs
        const customerName = document.getElementById('customerName').value;
        const phoneNumber = document.getElementById('phoneNumber').value;
        const productName = document.getElementById('productName').value;
        //const expectedDate = document.getElementById('expectedDate').value;
        const orderDate = getTodayDate();
        const productModel = document.getElementById('productModel').value;
        const notes = document.getElementById('notes').value;
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();

        try {
            await db.collection('orders').add({
                customerName,
                phoneNumber,
                productModel,
                productName,
                orderDate,
                notes,
                created: timestamp,
                isCompleted: false // Status flag for pending orders
            });
            
            orderForm.reset(); // Clear form on success
            showStatusMessage("✅ Order saved successfully!");

        } catch (error) {
            console.error("Error adding document: ", error);
            showStatusMessage("❌ Error saving order!");
        }
    });

    // --- FUNCTION 2: REAL-TIME LISTENER FOR PENDING ORDERS ---
    db.collection('orders')
      .where('isCompleted', '==', false) // Only show pending orders
      .orderBy('created', 'desc') // Show latest first
      .onSnapshot((snapshot) => {
        
        ordersList.innerHTML = ''; // Clear the current list
        
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }

        if (snapshot.empty) {
            ordersList.innerHTML = '<p style="text-align: center; color: var(--text-light);">No pending orders.</p>';
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const orderId = doc.id;
            
            // Format the order item HTML structure
            const orderItem = document.createElement('div');
            orderItem.className = 'order-item';
            orderItem.innerHTML = `
                <div class="order-details">
                    <strong>${data.customerName} - ${data.productModel} - ${data.productName}</strong>
                    <span>📞 ${data.phoneNumber}</span>
                    <span>Created Date: ${data.orderDate}</span>
                    ${data.notes ? `<span>Notes: ${data.notes}</span>` : ''}
                </div>
                <button class="complete-button" data-id="${orderId}">
                    <span class="material-icons">done_all</span> Delivered
                </button>
            `;
            ordersList.appendChild(orderItem);

            // Attach event listener for the complete button
            orderItem.querySelector('.complete-button').addEventListener('click', () => {
                markAsComplete(orderId, data.productModel, data.customerName, data.productName);
            });
        });
    }, (error) => {
        console.error("Error fetching orders: ", error);
        ordersList.innerHTML = `<p style="color: red;">Error loading data: ${error.message}</p>`;
    });

    // --- FUNCTION 3: MARK ORDER AS COMPLETE (UPDATE) ---
    async function markAsComplete(orderId, model, name, product) {
        // Use English for confirmation messages (UI/UX)
        if (confirm(`Mark order for ${name} (${model} - ${product}) as delivered?`)) { 
            try {
                await db.collection('orders').doc(orderId).update({
                    isCompleted: true,
                    completedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                showStatusMessage(`✅ Order for ${name} completed.`);
            } catch (error) {
                console.error("Error updating document: ", error);
                showStatusMessage("❌ Error completing order!");
            }
        }
    }

    // --- UTILITY FUNCTION: SHOW STATUS MESSAGE ---
    function showStatusMessage(message) {
        statusMessage.textContent = message;
        statusMessage.classList.add('show');
        setTimeout(() => {
            statusMessage.classList.remove('show');
        }, 3000); // Hide after 3 seconds
    }

} else {
    // Fallback if Firebase SDK is not loaded
    document.addEventListener('DOMContentLoaded', () => {
        ordersList.innerHTML = '<p style="color: red; text-align: center;">Firebase SDK not loaded. Check configuration.</p>';
    });
}
