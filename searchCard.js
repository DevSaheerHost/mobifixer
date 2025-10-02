export const searchCard = data =>`
<p class='s_status'>${data.sn}</p>
<p>${data.name} : ${data.number}</p>
<p>${data.model}</p>
<p>${data.complaints}</p>
<p>${data.amount ||''}</p>
<p>${data.advance ||''}</p>
<p class='status'>${data.status}</p>
<p>${data.date ||''}</p>

`