

let toastContainer;

function createContainer() {
  toastContainer = document.createElement("div");
  toastContainer.className = "toast-container";
  document.body.appendChild(toastContainer);
}

export default function showToast(message, type = "info") {
  if (!toastContainer) createContainer();

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  // icon map (Font Awesome)
  const icons = {
    success: "fa-circle-check",
    error: "fa-circle-xmark",
    warning: "fa-triangle-exclamation",
    info: "fa-circle-info",
  };

  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info} toast-icon"></i>
    <span class="toast-message">${message}</span>
    <div class="toast-progress"></div>
  `;

  toastContainer.appendChild(toast);

  // trigger progress animation
  setTimeout(() => toast.classList.add("show-progress"), 10);

  // remove after 3 s
  setTimeout(() => {
    toast.classList.add("hide");
    toast.addEventListener("animationend", () => toast.remove());
  }, 3000);
}