export const searchCard = data => {
  // ✅ Handle devices array if exists
  let deviceInfo = '';
  
  if (Array.isArray(data.devices) && data.devices.length > 0) {
    deviceInfo = data.devices.map(d=>`

<div class="device">

<p class="model">${d.model}</p>

<p class="complaint">${d.complaints}</p>

</div>

`).join("");
  } else {
    // fallback to old structure
    deviceInfo = `
      <p>${data.model || '<i>unknown</i>'}</p>
      <p>${data.complaints || '<i>none</i>'}</p>
    `;
  }
  
  return `
<div class="search-card">

<div class="top">

<span class="sn">#${data.sn}</span>

<span class="status ${data.isDeleted?'deleted':data.status}">
${data.isDeleted?'DELETED': data.status}
</span>


</div>

<h3>${data.name}</h3>

<p class="phone">
${data.number}
</p>

${deviceInfo}

<div class="bottom">

<span>₹${data.advance}</span>

<span>${data.date}</span>

</div>

</div>

  `;
};