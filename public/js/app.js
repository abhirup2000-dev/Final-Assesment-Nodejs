// ── WebSocket Notifications ──────────────────────────────────────────────────
function initWebSocketNotifications(userId, role) {
  if (!userId || !role) return;
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${protocol}://${location.host}/ws?userId=${userId}&role=${role}`);

  ws.onopen = () => console.log('📡 WebSocket connected');
  ws.onmessage = (e) => {
    try {
      const { event, data } = JSON.parse(e.data);
      showToast(getToastMessage(event, data), event === 'blog_approved' ? 'success' : 'info');
    } catch (_) {}
  };
  ws.onclose = () => {
    // Reconnect after 5 seconds
    setTimeout(() => initWebSocketNotifications(userId, role), 5000);
  };
}

function getToastMessage(event, data) {
  switch (event) {
    case 'blog_submitted': return `📝 ${data.message}`;
    case 'blog_approved':  return `✅ ${data.message}`;
    case 'blog_liked':     return `❤️  Your blog "${data.blogTitle}" received a like!`;
    case 'blog_commented': return `💬 ${data.userName} commented on "${data.blogTitle}"`;
    default: return data.message || 'New notification';
  }
}

// ── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  let container = document.getElementById('ws-toast');
  if (!container) {
    container = document.createElement('div');
    container.id = 'ws-toast';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span style="flex:1">${message}</span><span class="toast-close" onclick="this.parentElement.remove()">✕</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// ── Modal Helpers ─────────────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}
// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});
// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

// ── Like Button ───────────────────────────────────────────────────────────────
function toggleLike(blogId, btn) {
  fetch(`/blog/${blogId}/like`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        btn.classList.toggle('liked', data.liked);
        const count = btn.querySelector('.like-count');
        if (count) count.textContent = data.likeCount;
      } else if (data.message && data.message.includes('login')) {
        window.location.href = '/login';
      }
    });
}

// ── Delete confirm ─────────────────────────────────────────────────────────
function confirmDelete(formId) {
  if (confirm('Are you sure you want to delete this? This action cannot be undone.')) {
    document.getElementById(formId).submit();
  }
}

// ── Blog status badge color ────────────────────────────────────────────────
function statusBadge(status) {
  const map = { published: 'badge-success', pending: 'badge-warning', draft: 'badge-gray' };
  return map[status] || 'badge-gray';
}

// ── Auto-dismiss alerts ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.alert[data-autodismiss]').forEach(el => {
    setTimeout(() => el.remove(), 4000);
  });
});
