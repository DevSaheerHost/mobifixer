const items = [];

const updatePreview = () => {
  document.getElementById('pInvoiceNo').innerText =
    '#' + document.getElementById('invoiceNo').value;

  document.getElementById('pCustomer').innerText =
    document.getElementById('customer').value;

  const tbody = document.getElementById('items');
  tbody.innerHTML = '';

  let total = 0;

  items.forEach(i => {
    const row = document.createElement('tr');
    const rowTotal = i.qty * i.price;
    total += rowTotal;

    row.innerHTML = `
      <td>${i.name}</td>
      <td>${i.qty}</td>
      <td>₹${i.price}</td>
      <td>₹${rowTotal}</td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById('grandTotal').innerText =
    '₹' + total;
};

document.querySelectorAll('input').forEach(i =>
  i.addEventListener('input', updatePreview)
);

function addItem() {
  items.push({
    name: itemName.value,
    qty: +qty.value,
    price: +price.value
  });

  itemName.value = qty.value = price.value = '';
  updatePreview();
}


function saveInvoice() {
  const invoice = {
    id: Date.now(),          // UNIQUE
    invoiceNo: invoiceNo.value,
    customer: customer.value,
    items: JSON.parse(JSON.stringify(items)),
    createdAt: new Date().toISOString()
  };

  const list = JSON.parse(localStorage.getItem('invoices') || '[]');
  list.unshift(invoice); // latest first

  localStorage.setItem('invoices', JSON.stringify(list));
}


function downloadPDF() {
  saveInvoice();
  renderInvoiceList();

  const date = new Date().toISOString().split('T')[0];
  const filename = `${invoiceNo.value}_${date}.pdf`;

  html2pdf()
    .from(document.getElementById('invoice'))
    .set({
      filename: filename,   // 👈 THIS WAS MISSING
      margin: 10,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4' }
    })
    .save()
    .then(() => {
      resetInvoice();
    });
}





//----------------------- //
function loadInvoices() {
  return JSON.parse(localStorage.getItem('invoices') || '[]');
}


function sendWhatsApp() {
  const phone = '917592949476'; // customer
  const invoiceNo = invoiceNo.value;

  const msg = `
Hello,
Your invoice ${invoiceNo} is ready.

Please find the PDF attached.
Thank you – Mobifixer
  `.trim();

  const url =
    `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;

  window.open(url, '_blank');
}


function getNextInvoiceNo() {
  const year = new Date().getFullYear();
  const key = `invoice_counter_${year}`;

  let count = Number(localStorage.getItem(key) || 0) + 1;
  localStorage.setItem(key, count);

  return `INV-${year}-${String(count).padStart(4, '0')}`;
}


invoiceNo.value = getNextInvoiceNo();



function renderInvoiceList() {
  const list = JSON.parse(localStorage.getItem('invoices') || '[]');
  const ul = document.getElementById('invoiceList');

  ul.innerHTML = '';

  list.forEach(inv => {
    const li = document.createElement('li');
    li.innerHTML = `
      <b>${inv.invoiceNo}</b> – ${inv.customer}
      <button onclick="editInvoice(${inv.id})">Edit</button>
    `;
    ul.appendChild(li);
  });
}

renderInvoiceList();




function editInvoice(id) {
  const list = JSON.parse(localStorage.getItem('invoices') || '[]');
  const inv = list.find(i => i.id === id);

  if (!inv) return;

  invoiceNo.value = inv.invoiceNo;
  customer.value = inv.customer;

  items.length = 0;
  inv.items.forEach(i => items.push(i));

  updatePreview();
}



function resetInvoice() {
  // clear inputs
  customer.value = '';

  // clear items array (important)
  items.length = 0;

  // generate new invoice number
  invoiceNo.value = getNextInvoiceNo();

  // reset preview
  updatePreview();
}

