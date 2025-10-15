export const cardLayout = ({
  name,
  status,
  number,
  altNumber,
  model,
  lock,
  complaints,
  sn,
  date,
  advance,
  amount,
  notes,
  time,
  author,
  devices
}) => {
  
  // ✅ Handle both old and new structures
  let deviceDetails = '';

  if (Array.isArray(devices) && devices.length > 0) {
    deviceDetails = devices.map((d, i) => `
      <div class='device_box'>
        <div class='item_flex'>
          <p class='key'><b>Device ${i + 1}</b></p>
          <p class='value'>${d.model || '<i>unknown</i>'}</p>
        </div>
        <div class='item_flex'>
          <p class='key'><b>Complaints</b></p>
          <p class='value complaints'>${d.complaints || '<i>none</i>'}</p>
        </div>
        <div class='item_flex'>
          <p class='key'><b>Lock</b></p>
          <p class='value'>${d.lock || '<i>none</i>'}</p>
        </div>
      </div>
    `).join('');
  } else {
    // 🧩 Fallback to old structure
    deviceDetails = `
      <div class='item_flex'>
        <p class='key'><b>Model</b></p>
        <p class='value'>${model || '<i>unknown</i>'}</p>
      </div>

      <div class='item_flex'>
        <p class='key'><b>Complaints</b></p>
        <p class='value complaints'>${complaints || '<i>none</i>'}</p>
      </div>

      <div class='item_flex'>
        <p class='key'><b>Lock</b></p>
        <p class='value'>${lock || '<i>none</i>'}</p>
      </div>
    `;
  }

  return `
  <div class="box">
    
    <div class='item_flex'>
      <p class='key'><b>Number</b></p>
      <p class='value'>+91 ${number}</p>
    </div>
    ${altNumber?
      `    <div class='item_flex'>
      <p class='key'><b>Alt Number</b></p>
      <p class='value'>+91 ${altNumber}</p>
    </div>`:''
      
    }

    ${deviceDetails}

    <div class='item_flex'>
      <p class='key'><b>Date</b></p>
      <p class='value'>${date || ''} ${time || ''}</p>
    </div>

    <div class='item_flex'>
      <p class='key'><b>Approx Rate</b></p>
      <p class='amount value'>₹${amount ? Number(amount).toLocaleString('en-IN') : ''}</p>
    </div>

    <div class='item_flex'>
      <p class='key'><b>Advance</b></p>
      <p class='advance value'>₹${advance ? Number(advance).toLocaleString('en-IN') : ''}</p>
    </div>
    
    ${advance!=0?
      `
        <div class='item_flex'>
      <p class='key'><b>Balance</b></p>
      <p class='advance value'>₹${(Number(amount) - Number(advance)).toLocaleString('en-IN')}</p>
    </div>`:''
    }
  </div>

  <div class='note-input-wrap'>
    <textarea id='note-input-${sn}' class='add-note-input' placeholder='Add note+'>${notes || ''}</textarea>
    <button id='note-btn-${sn}' class='add-note-btn' name='sn-${sn}'>Save notes</button>
  </div>

  <div class="status">
    <span>
      <input type="radio" ${status === 'pending' ? 'checked' : ''} name="status-${sn}" id="pending-${sn}" />
      <label for="pending-${sn}">Pending</label>
    </span>

    <span>
      <input type="radio" ${status === 'spare' ? 'checked' : ''} name="status-${sn}" id="spare-${sn}" />
      <label for="spare-${sn}">Wait for Spare</label>
    </span>

    <span>
      <input type="radio" ${status === 'progress' ? 'checked' : ''} name="status-${sn}" id="progress-${sn}" />
      <label for="progress-${sn}">In Progress</label>
    </span>

    <span>
      <input type="radio" ${status === 'done' ? 'checked' : ''} name="status-${sn}" id="done-${sn}" />
      <label for="done-${sn}">Done</label>
    </span>

    <span>
      <input type="radio" ${status === 'collected' ? 'checked' : ''} name="status-${sn}" id="collected-${sn}" />
      <label for="collected-${sn}">Collected</label>
    </span>

    <span>
      <input type="radio" ${status === 'return' ? 'checked' : ''} name="status-${sn}" id="return-${sn}" />
      <label for="return-${sn}">Return</label>
    </span>

    <button class='call-btn' data-num="+91${number}">
      <i class="fa-solid fa-phone"></i>
    </button>

    <p class='author_name'>${author || ''}</p>
  </div>
  `;
};