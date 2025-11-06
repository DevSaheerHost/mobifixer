export default function Button({ label, onClick, dataset='' , type}) {
  const btn = document.createElement("button");
  btn.className = `btn ${type}`;
  btn.textContent = label;
  btn.onclick=e=>onClick(e);
  btn.dataset.index=dataset
  return btn;
}