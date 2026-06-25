// ── State ──────────────────────────────────────────────────────────────────
let SECRET = localStorage.getItem('kosh_admin_secret') || '';
let sarees = [];

// ── Elements ───────────────────────────────────────────────────────────────
const loginScreen   = document.getElementById('login-screen');
const dashboard     = document.getElementById('dashboard');
const loginForm     = document.getElementById('login-form');
const loginPw       = document.getElementById('login-pw');
const loginErr      = document.getElementById('login-err');
const logoutBtn     = document.getElementById('logout-btn');
const addBtn        = document.getElementById('add-btn');
const sareeList     = document.getElementById('saree-list');
const modalOverlay  = document.getElementById('modal-overlay');
const modalTitle    = document.getElementById('modal-title');
const modalCloseBtn = document.getElementById('modal-close-btn');
const formCancelBtn = document.getElementById('form-cancel-btn');
const sareeForm     = document.getElementById('saree-form');
const formErr       = document.getElementById('form-err');
const formSubmitBtn = document.getElementById('form-submit-btn');

const imgInput      = document.getElementById('img-input');
const imgPreview    = document.getElementById('img-preview');
const uploadArea    = document.getElementById('upload-area');
const uploadPlaceholder = document.getElementById('upload-placeholder');
const uploadProgress = document.getElementById('upload-progress');
const uploadFill    = document.getElementById('upload-fill');
const uploadStatus  = document.getElementById('upload-status');
const imageUrlField = document.getElementById('image_url');

// ── Helpers ────────────────────────────────────────────────────────────────
function api(path, opts = {}) {
  return fetch(path, {
    ...opts,
    headers: { 'X-Admin-Secret': SECRET, ...(opts.headers || {}) },
  });
}

function fmtPrice(price, orig) {
  const f = n => '₹' + Number(n).toLocaleString('en-IN');
  return orig ? `<s>${f(orig)}</s> ${f(price)}` : f(price);
}

function showError(el, msg) {
  el.textContent = msg;
  el.hidden = false;
}
function clearError(el) { el.hidden = true; el.textContent = ''; }

// ── Auth ───────────────────────────────────────────────────────────────────
async function tryLogin(pw) {
  // Validate password by hitting a protected endpoint
  const res = await fetch('/api/sarees', {
    headers: { 'X-Admin-Secret': pw },
  });
  // /api/sarees is public (GET), so we verify with a dummy POST
  const check = await fetch('/api/sarees', {
    method: 'POST',
    headers: { 'X-Admin-Secret': pw, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  // 400 = bad body but auth passed; 401 = wrong password
  return check.status !== 401;
}

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  clearError(loginErr);
  const pw = loginPw.value.trim();
  const btn = loginForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Checking…';
  const ok = await tryLogin(pw);
  btn.disabled = false;
  btn.textContent = 'Sign In';
  if (!ok) { showError(loginErr, 'Incorrect password.'); return; }
  SECRET = pw;
  localStorage.setItem('kosh_admin_secret', pw);
  showDashboard();
});

logoutBtn.addEventListener('click', () => {
  SECRET = '';
  localStorage.removeItem('kosh_admin_secret');
  dashboard.hidden = true;
  loginScreen.hidden = false;
  loginPw.value = '';
});

function showDashboard() {
  loginScreen.hidden = true;
  dashboard.hidden = false;
  loadSarees();
}

// ── Saree list ─────────────────────────────────────────────────────────────
async function loadSarees() {
  sareeList.innerHTML = '<p class="loading-msg">Loading…</p>';
  const res = await api('/api/sarees');
  if (!res.ok) { sareeList.innerHTML = '<p class="loading-msg">Failed to load. Please refresh.</p>'; return; }
  sarees = await res.json();
  renderTable();
}

function renderTable() {
  if (sarees.length === 0) {
    sareeList.innerHTML = '<div class="empty-state"><p>No sarees yet. Click "+ Add Saree" to get started.</p></div>';
    return;
  }
  sareeList.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Image</th>
          <th>Name &amp; Type</th>
          <th>Price</th>
          <th>Badge</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${sarees.map(s => `
          <tr>
            <td><img class="tbl-thumb" src="${s.image_url}" alt="${s.name}" onerror="this.style.opacity='.3'"/></td>
            <td>
              <div class="tbl-name">${s.name}</div>
              <div class="tbl-type">${s.type}</div>
            </td>
            <td class="tbl-price">${fmtPrice(s.price, s.original_price)}</td>
            <td>${s.badge ? `<span class="badge-pill">${s.badge}</span>` : '—'}</td>
            <td>
              <div class="tbl-actions">
                <button class="btn-edit" onclick="openEdit(${s.id})">Edit</button>
                <button class="btn-delete" onclick="deleteSaree(${s.id}, '${s.name.replace(/'/g, "\\'")}')">Delete</button>
              </div>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// ── Image Upload ────────────────────────────────────────────────────────────
uploadArea.addEventListener('click', () => imgInput.click());

uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleImageFile(file);
});

imgInput.addEventListener('change', () => {
  if (imgInput.files[0]) handleImageFile(imgInput.files[0]);
});

async function handleImageFile(file) {
  if (file.size > 5 * 1024 * 1024) { showError(formErr, 'Image must be under 5MB.'); return; }
  clearError(formErr);

  // Show preview immediately
  const reader = new FileReader();
  reader.onload = ev => {
    imgPreview.src = ev.target.result;
    imgPreview.hidden = false;
    uploadPlaceholder.hidden = true;
  };
  reader.readAsDataURL(file);

  // Upload to R2
  uploadProgress.hidden = false;
  uploadFill.style.width = '30%';
  uploadStatus.textContent = 'Uploading…';
  formSubmitBtn.disabled = true;

  const fd = new FormData();
  fd.append('image', file);
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'X-Admin-Secret': SECRET },
      body: fd,
    });
    if (!res.ok) throw new Error(await res.text());
    const { url } = await res.json();
    imageUrlField.value = url;
    uploadFill.style.width = '100%';
    uploadStatus.textContent = 'Uploaded';
  } catch (err) {
    uploadStatus.textContent = 'Upload failed';
    showError(formErr, 'Image upload failed: ' + err.message);
    imageUrlField.value = '';
  } finally {
    formSubmitBtn.disabled = false;
  }
}

// ── Modal ──────────────────────────────────────────────────────────────────
function openModal() {
  modalOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  modalOverlay.hidden = true;
  document.body.style.overflow = '';
  sareeForm.reset();
  clearError(formErr);
  imageUrlField.value = '';
  imgPreview.hidden = true;
  uploadPlaceholder.hidden = false;
  uploadProgress.hidden = true;
  uploadFill.style.width = '0%';
  imgInput.value = '';
}

addBtn.addEventListener('click', () => {
  document.getElementById('edit-id').value = '';
  modalTitle.textContent = 'Add Saree';
  formSubmitBtn.textContent = 'Save Saree';
  openModal();
});

modalCloseBtn.addEventListener('click', closeModal);
formCancelBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

function openEdit(id) {
  const s = sarees.find(x => x.id === id);
  if (!s) return;
  document.getElementById('edit-id').value = s.id;
  document.getElementById('name').value = s.name;
  document.getElementById('type').value = s.type;
  document.getElementById('price').value = s.price;
  document.getElementById('original_price').value = s.original_price || '';
  document.getElementById('badge').value = s.badge || '';
  document.getElementById('sort_order').value = s.sort_order || 0;
  document.getElementById('wa_message').value = s.wa_message || '';
  imageUrlField.value = s.image_url;
  imgPreview.src = s.image_url;
  imgPreview.hidden = false;
  uploadPlaceholder.hidden = true;
  uploadProgress.hidden = true;
  modalTitle.textContent = 'Edit Saree';
  formSubmitBtn.textContent = 'Update Saree';
  openModal();
}

// ── Submit ─────────────────────────────────────────────────────────────────
sareeForm.addEventListener('submit', async e => {
  e.preventDefault();
  clearError(formErr);

  const imageUrl = imageUrlField.value.trim();
  if (!imageUrl) { showError(formErr, 'Please upload an image first.'); return; }

  const payload = {
    name:           document.getElementById('name').value.trim(),
    type:           document.getElementById('type').value,
    price:          Number(document.getElementById('price').value),
    original_price: document.getElementById('original_price').value ? Number(document.getElementById('original_price').value) : null,
    badge:          document.getElementById('badge').value || null,
    sort_order:     Number(document.getElementById('sort_order').value) || 0,
    wa_message:     document.getElementById('wa_message').value.trim() || null,
    image_url:      imageUrl,
  };

  const editId = document.getElementById('edit-id').value;
  formSubmitBtn.disabled = true;
  formSubmitBtn.textContent = 'Saving…';

  try {
    const res = await api(
      editId ? `/api/sarees/${editId}` : '/api/sarees',
      {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) throw new Error(await res.text());
    closeModal();
    await loadSarees();
  } catch (err) {
    showError(formErr, 'Error saving saree: ' + err.message);
  } finally {
    formSubmitBtn.disabled = false;
    formSubmitBtn.textContent = editId ? 'Update Saree' : 'Save Saree';
  }
});

// ── Delete ─────────────────────────────────────────────────────────────────
async function deleteSaree(id, name) {
  if (!confirm(`Delete "${name}"? This will remove it from the website.`)) return;
  const res = await api(`/api/sarees/${id}`, { method: 'DELETE' });
  if (res.ok) {
    await loadSarees();
  } else {
    alert('Failed to delete. Please try again.');
  }
}

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  if (SECRET) {
    const ok = await tryLogin(SECRET);
    if (ok) {
      showDashboard();
    } else {
      SECRET = '';
      localStorage.removeItem('kosh_admin_secret');
    }
  }
}

init();
