export const searchCard = data => {
  // ✅ Handle devices array if exists
  let deviceInfo = '';
  
  if (Array.isArray(data.devices) && data.devices.length > 0) {
    deviceInfo = data.devices.map((d, i) => `
      <p>M ${i + 1}: ${d.model || '<i>unknown</i>'}</p>
      <p>C : ${d.complaints || '<i>none</i>'}</p>
    `).join('');
  } else {
    // fallback to old structure
    deviceInfo = `
      <p>${data.model || '<i>unknown</i>'}</p>
      <p>${data.complaints || '<i>none</i>'}</p>
    `;
  }
  
  return `
    <p class='s_status'>${data.sn}</p>
    <p>${data.name} : ${data.number}</p>
    ${deviceInfo}
    <p>${data.advance || ''}</p>
    <p class='status'>${data.status}</p>
    <p>${data.date || ''}</p>
  `;
};