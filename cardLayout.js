// The summary row that every job in the list shows before it is opened.
//
// Until now the whole card was expanded for every job at once - device,
// complaints, amounts, a note box and six status buttons, for all 1248 jobs on
// a real shop. There WAS a collapse (tap the nav), but it set height:10px, so a
// collapsed card showed nothing at all, not even whose job it was. Nobody used
// it, so the list was unscannable.
//
// This row carries enough to not need opening: who, which device, what state,
// what is still owed. Three places in main.js built the list and each wrote its
// own <nav> - two of them just a name and a serial, the third with an avatar,
// a checkbox and an edit pencil - so the list changed shape depending on how
// you got to it. All three call this now. (The search dropdown is a separate
// component, searchCard.js, and keeps its own markup.)

import { parsePattern, patternSvg, patternText } from './pattern.js';

const STATUS_LABEL = {
  pending:   'Pending',
  spare:     'Spare',
  progress:  'In progress',
  done:      'Done',
  collected: 'Collected',
  return:    'Return'
};

const initialsOf = (s = '') =>
  s.trim().split(/\s+/).map(w => w[0] || '').filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

const money = (n) => '\u20b9' + Number(n || 0).toLocaleString('en-IN');

// An empty amount used to render as a lone "\u20b9" with nothing after it. Say so
// instead, in the same muted style the shop details page uses.
const rupees = (n) => {
  const v = String(n == null ? '' : n).trim();
  return v === '' ? '<span class="value-unset">Not set</span>' : money(v);
};

// Escaped: these are customer-entered values going into innerHTML.
const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// A pattern lock used to print as "Pattern 1-2-5-6-9", which is the shape it is
// stored in, not a shape anyone reads. Draw it. The digits stay next to the
// picture because they are what gets read out over the phone, and because a
// 30px grid is for recognising a pattern, not for copying one dot by dot - the
// chip opens a full-size view for that.
//
// A lock that is not a pattern (a PIN, a password, a note) is untouched: same
// escaped text it has always been.
const lockValue = (lock) => {
  const dots = parsePattern(lock);
  if (!dots) return esc(lock) || '<i>none</i>';
  // Hyphens, not spaced en-dashes. A nine-dot pattern spelled "2 – 5 – 7 – 3 –
  // 6 – 8 – 4 – 1 – 9" is 33 characters, which wrapped the chip onto two lines
  // and left the picture as an afterthought beside a wall of digits. The
  // spaced-out form is still what the full-size view uses, where there is room.
  return `<button type="button" class="pattern-chip" data-pattern="${dots.join('-')}"
            aria-label="Unlock pattern ${dots.join(' ')}, tap to enlarge">
            ${patternSvg(dots)}<span>${dots.join('-')}</span>
          </button>`;
};

export const cardSummary = (item = {}) => {
  const { name, sn, status, amount, advance, devices, model } = item;
  const firstModel = (Array.isArray(devices) && devices.length && devices[0].model) || model || '';
  // An amount that was never entered is not a settled balance. Both come back
  // as empty strings, so `amount - advance` was 0 and the row said "Settled"
  // about money nobody had recorded.
  const hasAmount = String(amount == null ? '' : amount).trim() !== '';
  const balance = Number(amount || 0) - Number(advance || 0);
  const label = STATUS_LABEL[status] || status || 'Pending';

  return `
    <label class="pick" for="${esc(sn)}" aria-label="Select this job">
      <input type="checkbox" class="multiSelect" data-sn="${esc(sn)}" id="${esc(sn)}">
      <span class="circle">${esc(initialsOf(name))}</span>
    </label>

    <span class="who">
      <h3>${esc(name) || '<i>No name</i>'}</h3>
      <span class="meta">
        <span class="chip s-${esc(status || 'pending')}">${esc(label)}</span>
        ${firstModel ? `<span class="model">${esc(firstModel)}</span>` : ''}
      </span>
    </span>

    <span class="trail">
      <span class="sn">${esc(sn)}</span>
      ${!hasAmount
        ? ''
        : balance > 0
          ? `<span class="due" title="Balance">${money(balance)}</span>`
          : `<span class="due settled">Settled</span>`}
    </span>

    <i class="fa-solid fa-chevron-down caret" aria-hidden="true"></i>
    <i class="fa-solid fa-pen editIcon" data-sn="${esc(sn)}" aria-label="Edit"></i>
  `;
};

// Every value below goes through esc(). Customer names, device models,
// complaints, notes and phone numbers were interpolated into innerHTML raw, so
// a job whose complaint read `<img src=x onerror=...>` ran that script in the
// shop's page. Those fields are attacker-writable today because the database
// has no rules on it yet. The `<i>unknown</i>` fallbacks stay outside esc() -
// they are ours, not the customer's.
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
  const me = localStorage.getItem('author')

  if (Array.isArray(devices) && devices.length > 0) {
    deviceDetails = devices.map((d, i) => `
      <div class='device_box mt-2'>
        <div class='item_flex'>
          <p class='key'>Device ${i + 1}</p>
          <p class='value'>${esc(d.model) || '<i>unknown</i>'}</p>
        </div>
        <div class='item_flex'>
          <p class='key'>Complaints</p>
          <p class='value complaints'>${esc(d.complaints) || '<i>none</i>'}</p>
        </div>

  ${d.lock?`<div class='item_flex end'>
    <p class='key'>Lock</p>
    <p class='value'>${lockValue(d.lock)}</p>
  </div>`:''}
      </div>
    `).join('');
  } else {
    // 🧩 Fallback to old structure
    deviceDetails = `
      <div class='item_flex'>
        <p class='key'>Model</p>
        <p class='value'>${esc(model) || '<i>unknown</i>'}</p>
      </div>

      <div class='item_flex'>
        <p class='key'>Complaints</p>
        <p class='value complaints'>${esc(complaints) || '<i>none</i>'}</p>
      </div>

      <div class='item_flex'>
        <p class='key'>${lock ? 'Lock' : ''}</p>
        <p class='value'>${lockValue(lock)}</p>
      </div>
    `;
  }

  return `
  <div class="box">
    
  
      
    

    ${deviceDetails}



    
<div class='amount_box'>

    <div class='item_flex'>
      <p class='key'>Around</p>
      <p class='amount value'>${rupees(amount)}</p>
    </div>

    <div class='item_flex'>
      <p class='key'>Advance</p>
      <p class='advance value'>${rupees(advance)}</p>
    </div>
    
    ${advance!=0?
      `
        <div class='item_flex'>
      <p class='key'>Balance</p>
      <p class='complaints value'>₹${(Number(amount) - Number(advance)).toLocaleString('en-IN')}</p>
    </div>`:''
    }
    </div>
    
    
      <div class='item_flex'>
      <p class='key'>${esc(number)}</p>
      <p class='value'>${esc(date)} ${esc(time)}</p>
    </div>
    ${altNumber?
      `    <div class='item_flex'>
      <p class='key'>Alt Number</p>
      <p class='value'>+91 ${esc(altNumber)}</p>
    </div>`:''}
  </div>

  <div class='note-input-wrap'>
    <textarea id='note-input-${sn}' class='add-note-input' placeholder='Add note+'>${esc(notes)}</textarea>
    <button id='note-btn-${sn}' class='add-note-btn' name='sn-${sn}'>Save notes</button>
  </div>

  <div class="status">
    <span class="${status==='pending'? 'active': ''} bt_glass">
      <input type="radio" ${status === 'pending' ? 'checked' : ''} name="status-${sn}" id="pending-${sn}" />
      <label for="pending-${sn}">Pending</label>
    </span>

    <span class="${status==='spare'? 'active': ''} bt_glass">
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

    <span class="${status==='return'? 'active': ''} bb_glass">
      <input type="radio" ${status === 'return' ? 'checked' : ''} name="status-${sn}" id="return-${sn}" />
      <label for="return-${sn}">Return</label>
    </span>

      <button class='call-btn bb_glass' data-num="+91${esc(number)}">
      <i class="fa-solid fa-phone"></i>
    </button>
  </div>
  
  <div class='flex-center card-actions-row'>
    <button class='print-btn' data-sn='${sn}'>
      <i class='fa-solid fa-print'></i> Print
    </button>

    <button class='remind-btn' data-sn='${sn}' aria-label='Set a reminder for this job'>
      <i class='fa-regular fa-bell'></i> Remind
    </button>

<p class="author_name">
  ${author === me
    ? '<span class="you"><i class="fa-solid fa-user"></i> You</span>'
    : `<span>${esc(author) || 'Unknown'}</span>`}
</p>
    </div>
  `;
};