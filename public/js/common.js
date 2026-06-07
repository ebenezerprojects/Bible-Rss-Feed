function showToast(message, type) {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.position = 'fixed';
        toastContainer.style.bottom = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    const toastId = 'toast-' + Date.now();
    const bgColor = type === 'success' ? 'bg-success' : type === 'danger' ? 'bg-danger' : 'bg-warning';
    const icon = type === 'success' ? 'fa-check-circle' : type === 'danger' ? 'fa-exclamation-circle' : 'fa-info-circle';
    const toastHtml = `<div id="${toastId}" class="toast show" role="alert" data-bs-autohide="true" data-bs-delay="5000"><div class="toast-header ${bgColor} text-white"><i class="fas ${icon} me-2"></i><strong class="me-auto">Bible API</strong><small>Just now</small><button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button></div><div class="toast-body">${message}</div></div>`;
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    setTimeout(() => { const toast = document.getElementById(toastId); if (toast) toast.remove(); }, 5000);
}
window.showToast = showToast;