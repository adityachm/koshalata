// ── State ──────────────────────────────────────────────────────────────────
let SECRET = '';
let sarees = [];
let imageList = []; // array of uploaded image URLs for current form

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
const addImgBtn     = document.getElementById('add-img-btn');
const multiImgList  = document.getElementById('multi-img-list');
const uploadStatusBar = document.getElementById('upload-status-bar');
const uploadFill    = document.getElementById('upload-fill');
const uploadStatus  = document.getElementById('upload-status');

// Cover photo elements
const coverUploadBtn  = document.getElementById('cover-upload-btn');
const coverInput      = document.getElementById('cover-input');
const coverPreviewImg = document.getElementById('cover-preview-img');
const coverEmpty      = document.getElementById('cover-preview-empty');
const coverStatusBar  = document.getElementById('cover-status-bar');
const coverFill       = document.getElementById('cover-fill');
const coverStatusTxt  = document.getElementById('cover-status');
const coverErr        = document.getElementById('cover-err');

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

function showError(el, msg) { el.textContent = msg; el.hidden = false; }
function clearError(el) { el.hidden = true; el.textContent = ''; }

// ── Auth ───────────────────────────────────────────────────────────────────
async function tryLogin(pw) {
  const check = await fetch('/api/sarees', {
    method: 'POST',
    headers: { 'X-Admin-Secret': pw, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return check.status !== 401;
}

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  clearError(loginErr);
  const pw = loginPw.value.trim();
  const btn = loginForm.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Checking…';
  const ok = await tryLogin(pw);
  btn.disabled = false; btn.textContent = 'Sign In';
  if (!ok) { showError(loginErr, 'Incorrect password.'); return; }
  SECRET = pw;
  showDashboard();
});

logoutBtn.addEventListener('click', () => {
  SECRET = '';
  dashboard.hidden = true;
  loginScreen.hidden = false;
  loginPw.value = '';
});

function showDashboard() {
  loginScreen.hidden = true;
  dashboard.hidden = false;
  loadSarees();
  loadCoverPhoto();
}

// ── Cover photo ────────────────────────────────────────────────────────────────
async function loadCoverPhoto() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const s = await res.json();
    setCoverPreview(s.hero_image);
  } catch {}
}

function setCoverPreview(url) {
  if (url) {
    coverPreviewImg.src = url;
    coverPreviewImg.hidden = false;
    coverEmpty.hidden = true;
  } else {
    coverPreviewImg.hidden = true;
    coverEmpty.hidden = false;
  }
}

coverUploadBtn.addEventListener('click', () => coverInput.click());
coverInput.addEventListener('change', () => {
  if (coverInput.files[0]) { uploadCoverPhoto(coverInput.files[0]); coverInput.value = ''; }
});

async function uploadCoverPhoto(file) {
  if (file.size > 10 * 1024 * 1024) { showError(coverErr, 'Cover photo must be under 10MB.'); return; }
  clearError(coverErr);
  coverUploadBtn.disabled = true; coverUploadBtn.textContent = 'Uploading…';
  coverStatusBar.hidden = false; coverFill.style.width = '40%'; coverStatusTxt.textContent = 'Uploading…';

  try {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('prefix', 'covers');
    const upRes = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'X-Admin-Secret': SECRET },
      body: fd,
    });
    if (!upRes.ok) throw new Error(await upRes.text());
    const { url } = await upRes.json();

    coverFill.style.width = '70%'; coverStatusTxt.textContent = 'Saving…';

    const saveRes = await api('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'hero_image', value: url }),
    });
    if (!saveRes.ok) throw new Error(await saveRes.text());

    coverFill.style.width = '100%'; coverStatusTxt.textContent = 'Updated ✓';
    setCoverPreview(url);
    setTimeout(() => { coverStatusBar.hidden = true; coverFill.style.width = '0%'; }, 1400);
  } catch (err) {
    showError(coverErr, 'Upload failed: ' + err.message);
    coverStatusBar.hidden = true;
  } finally {
    coverUploadBtn.disabled = false; coverUploadBtn.textContent = 'Upload New Photo';
  }
}

// ── Saree list ─────────────────────────────────────────────────────────────
async function loadSarees() {
  sareeList.innerHTML = '<p class="loading-msg">Loading…</p>';
  const res = await api('/api/sarees');
  if (!res.ok) { sareeList.innerHTML = '<p class="loading-msg">Failed to load.</p>'; return; }
  sarees = await res.json();
  renderTable();
}

function renderTable() {
  if (!sarees.length) {
    sareeList.innerHTML = '<div class="empty-state"><p>No sarees yet. Click "+ Add Saree" to get started.</p></div>';
    return;
  }
  sareeList.innerHTML = `
    <table>
      <thead><tr>
        <th>Image</th><th>Name &amp; Collection</th><th>Price</th><th>Badge</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${sarees.map(s => {
          const imgs = s.imageList && s.imageList.length ? s.imageList : [s.image_url];
          return `<tr>
            <td><img class="tbl-thumb" src="${imgs[0]}" alt="${s.name}" onerror="this.style.opacity='.3'"/>
              ${imgs.length > 1 ? `<span style="font-size:10px;color:var(--mu);display:block;text-align:center">+${imgs.length-1} more</span>` : ''}
            </td>
            <td>
              <div class="tbl-name">${s.name}</div>
              <div class="tbl-type">${s.type} · ${s.collection || 'New Arrivals'}</div>
            </td>
            <td class="tbl-price">${fmtPrice(s.price, s.original_price)}</td>
            <td>${s.badge ? `<span class="badge-pill">${s.badge}</span>` : '—'}</td>
            <td><div class="tbl-actions">
              <button class="btn-edit" onclick="openEdit(${s.id})">Edit</button>
              <button class="btn-delete" onclick="deleteSaree(${s.id}, '${s.name.replace(/'/g,"\\'")}')">Delete</button>
            </div></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

// ── Multi-image list ────────────────────────────────────────────────────────
function renderImageList() {
  multiImgList.innerHTML = imageList.map((url, i) => `
    <div class="img-thumb-wrap">
      <img src="${url}" alt="Image ${i+1}"/>
      ${i === 0 ? '<span class="img-main-tag">Main</span>' : ''}
      <button type="button" class="img-rm" data-idx="${i}" aria-label="Remove">×</button>
    </div>`).join('');
  multiImgList.querySelectorAll('.img-rm').forEach(btn => {
    btn.addEventListener('click', () => {
      imageList.splice(Number(btn.dataset.idx), 1);
      renderImageList();
    });
  });
  addImgBtn.hidden = imageList.length >= 6;
}

addImgBtn.addEventListener('click', () => imgInput.click());
imgInput.addEventListener('change', () => {
  if (imgInput.files[0]) { handleImageFile(imgInput.files[0]); imgInput.value = ''; }
});

async function handleImageFile(file) {
  if (file.size > 5 * 1024 * 1024) { showError(formErr, 'Image must be under 5MB.'); return; }
  clearError(formErr);
  addImgBtn.disabled = true; addImgBtn.textContent = 'Uploading…';
  uploadStatusBar.hidden = false; uploadFill.style.width = '40%';
  uploadStatus.textContent = 'Uploading…';

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
    imageList.push(url);
    renderImageList();
    uploadFill.style.width = '100%';
    uploadStatus.textContent = 'Uploaded ✓';
    setTimeout(() => { uploadStatusBar.hidden = true; uploadFill.style.width = '0%'; }, 1200);
  } catch (err) {
    showError(formErr, 'Upload failed: ' + err.message);
    uploadStatusBar.hidden = true;
  } finally {
    addImgBtn.disabled = false;
    addImgBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Image`;
  }
}

// ── Modal ──────────────────────────────────────────────────────────────────
function openModal() { modalOverlay.hidden = false; document.body.style.overflow = 'hidden'; }
function closeModal() {
  modalOverlay.hidden = true; document.body.style.overflow = '';
  sareeForm.reset(); document.getElementById('is_sold_out').checked = false; clearError(formErr);
  imageList = []; renderImageList();
  uploadStatusBar.hidden = true; uploadFill.style.width = '0%';
  imgInput.value = ''; addImgBtn.hidden = false;
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
  document.getElementById('collection').value = s.collection || 'New Arrivals';
  document.getElementById('type').value = s.type;
  document.getElementById('badge').value = s.badge || '';
  document.getElementById('price').value = s.price;
  document.getElementById('original_price').value = s.original_price || '';
  document.getElementById('description').value = s.description || '';
  document.getElementById('sort_order').value = s.sort_order || 0;
  document.getElementById('wa_message').value = s.wa_message || '';
  document.getElementById('is_sold_out').checked = !!s.is_sold_out;
  imageList = s.imageList && s.imageList.length ? [...s.imageList] : (s.image_url ? [s.image_url] : []);
  renderImageList();
  modalTitle.textContent = 'Edit Saree';
  formSubmitBtn.textContent = 'Update Saree';
  openModal();
}

// ── Submit ─────────────────────────────────────────────────────────────────
sareeForm.addEventListener('submit', async e => {
  e.preventDefault();
  clearError(formErr);
  if (!imageList.length) { showError(formErr, 'Please add at least one image.'); return; }
  const editId = document.getElementById('edit-id').value;
  const payload = {
    name:           document.getElementById('name').value.trim(),
    collection:     document.getElementById('collection').value,
    type:           document.getElementById('type').value,
    badge:          document.getElementById('badge').value || null,
    price:          Number(document.getElementById('price').value),
    original_price: document.getElementById('original_price').value ? Number(document.getElementById('original_price').value) : null,
    description:    document.getElementById('description').value.trim(),
    sort_order:     Number(document.getElementById('sort_order').value) || 0,
    wa_message:     document.getElementById('wa_message').value.trim() || null,
    images:         imageList,
    is_sold_out:    document.getElementById('is_sold_out').checked,
  };
  formSubmitBtn.disabled = true; formSubmitBtn.textContent = 'Saving…';
  try {
    const res = await api(
      editId ? `/api/sarees/${editId}` : '/api/sarees',
      { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );
    if (!res.ok) throw new Error(await res.text());
    closeModal(); await loadSarees();
  } catch (err) {
    showError(formErr, 'Error saving: ' + err.message);
  } finally {
    formSubmitBtn.disabled = false;
    formSubmitBtn.textContent = editId ? 'Update Saree' : 'Save Saree';
  }
});

// ── Delete ─────────────────────────────────────────────────────────────────
async function deleteSaree(id, name) {
  if (!confirm(`Delete "${name}"?`)) return;
  const res = await api(`/api/sarees/${id}`, { method: 'DELETE' });
  if (res.ok) await loadSarees();
  else alert('Failed to delete.');
}

// ── Storage cleanup ────────────────────────────────────────────────────────
document.getElementById('cleanup-btn').addEventListener('click', async () => {
  const btn = document.getElementById('cleanup-btn');
  const result = document.getElementById('cleanup-result');
  const err = document.getElementById('cleanup-err');
  result.hidden = true; err.hidden = true;
  btn.disabled = true; btn.textContent = 'Cleaning…';

  try {
    const res = await api('/api/cleanup', { method: 'POST' });
    if (!res.ok) throw new Error(await res.text());
    const { deleted, keys } = await res.json();
    result.hidden = false;
    result.textContent = deleted === 0
      ? 'No orphaned images found — storage is clean.'
      : `Deleted ${deleted} orphaned file${deleted > 1 ? 's' : ''}: ${keys.join(', ')}`;
  } catch (e) {
    showError(err, 'Cleanup failed: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Clean Up Storage';
  }
});

// ── Init ───────────────────────────────────────────────────────────────────
loginScreen.hidden = false;
dashboard.hidden = true;
renderImageList();
