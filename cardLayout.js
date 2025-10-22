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
          <p class='key'>Device ${i + 1}</p>
          <p class='value'>${d.model || '<i>unknown</i>'}</p>
        </div>
        <div class='item_flex'>
          <p class='key'>Complaints</p>
          <p class='value complaints'>${d.complaints || '<i>none</i>'}</p>
        </div>
        <div class='item_flex'>
          <p class='key'>Lock</p>
          <p class='value'>${d.lock || '<i>none</i>'}</p>
        </div>
      </div>
    `).join('');
  } else {
    // 🧩 Fallback to old structure
    deviceDetails = `
      <div class='item_flex'>
        <p class='key'>Model</p>
        <p class='value'>${model || '<i>unknown</i>'}</p>
      </div>

      <div class='item_flex'>
        <p class='key'>Complaints</p>
        <p class='value complaints'>${complaints || '<i>none</i>'}</p>
      </div>

      <div class='item_flex'>
        <p class='key'>Lock</p>
        <p class='value'>${lock || '<i>none</i>'}</p>
      </div>
    `;
  }

  return `
  <div class="box">
    
    <div class='item_flex'>
      <p class='key'>Number</p>
      <p class='value'>+91 ${number}</p>
    </div>
    ${altNumber?
      `    <div class='item_flex'>
      <p class='key'>Alt Number</p>
      <p class='value'>+91 ${altNumber}</p>
    </div>`:''
      
    }

    ${deviceDetails}

    <div class='item_flex'>
      <p class='key'>Date</p>
      <p class='value'>${date || ''} ${time || ''}</p>
    </div>

    <div class='item_flex'>
      <p class='key'>Approx Rate</p>
      <p class='amount value'>₹${amount ? Number(amount).toLocaleString('en-IN') : ''}</p>
    </div>

    <div class='item_flex'>
      <p class='key'>Advance</p>
      <p class='advance value'>₹${advance ? Number(advance).toLocaleString('en-IN') : ''}</p>
    </div>
    
    ${advance!=0?
      `
        <div class='item_flex'>
      <p class='key'>Balance</p>
      <p class='complaints value'>₹${(Number(amount) - Number(advance)).toLocaleString('en-IN')}</p>
    </div>`:''
    }
  </div>

  <div class='note-input-wrap'>
    <textarea id='note-input-${sn}' class='add-note-input' placeholder='Add note+'>${notes || ''}</textarea>
    <button id='note-btn-${sn}' class='add-note-btn' name='sn-${sn}'>Save notes</button>
  </div>

  <div class="status">
    <span class="${status==='pending'? 'active': ''}">
      <input type="radio" ${status === 'pending' ? 'checked' : ''} name="status-${sn}" id="pending-${sn}" />
      <label for="pending-${sn}">Pending</label>
    </span>

    <span class="${status==='spare'? 'active': ''}">
      <input type="radio" ${status === 'spare' ? 'checked' : ''} name="status-${sn}" id="spare-${sn}" />
      <label for="spare-${sn}">Wait for Spare</label>
    </span>

    <span class="${status==='progress'? 'active': ''}">
      <input type="radio" ${status === 'progress' ? 'checked' : ''} name="status-${sn}" id="progress-${sn}" />
      <label for="progress-${sn}">In Progress</label>
    </span>

    <span class="${status==='done'? 'active': ''}">
      <input type="radio" ${status === 'done' ? 'checked' : ''} name="status-${sn}" id="done-${sn}" />
      <label for="done-${sn}">Done</label>
    </span>

    <span class="${status==='collected'? 'active': ''}">
      <input type="radio" ${status === 'collected' ? 'checked' : ''} name="status-${sn}" id="collected-${sn}" />
      <label for="collected-${sn}">Collected</label>
    </span>

    <span class="${status==='return'? 'active': ''}">
      <input type="radio" ${status === 'return' ? 'checked' : ''} name="status-${sn}" id="return-${sn}" />
      <label for="return-${sn}">Return</label>
    </span>

      <button class='call-btn' data-num="+91${number}">
      <i class="fa-solid fa-phone"></i>
    </button>
  </div>
  
  <div class='flex-center'>


    <p class='author_name'>${author || ''}</p>
    </div>
  `;
};