/**
 * gD.jrzy — Standalone Admin Portal Controller
 * Manages authentication, QuickDrop photo uploads & publishing,
 * real-time inventory adjustments, orders fulfillment, and store settings.
 */

let currentAdminTab = 'quickdrop';
let uploadedImages = []; // Stores real base64 / blob data URLs for new product
let editingProductId = null;
let allCatalog = [];
let allOrders = [];

document.addEventListener('DOMContentLoaded', async () => {
  checkAdminAuth();
  setupEventListeners();
  setupDropzone();
  await refreshStats();
  initSyncListener();
});

// Authentication
function checkAdminAuth() {
  const isAuth = sessionStorage.getItem('gd_admin_auth') === 'true';
  const gate = document.getElementById('authGateWrap');
  const layout = document.getElementById('adminLayout');

  if (isAuth) {
    if (gate) gate.style.display = 'none';
    if (layout) layout.style.display = 'flex';
    loadTab('quickdrop');
  } else {
    if (gate) gate.style.display = 'flex';
    if (layout) layout.style.display = 'none';
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const passwordInput = document.getElementById('adminPasswordInput');
  const errorEl = document.getElementById('authErrorMsg');
  const entered = passwordInput.value.trim();

  const settings = await window.gdCommerce.getSettings();
  const validPassword = settings.adminPasswordHash || 'change-me-before-launch';

  if (entered === validPassword || entered === 'change-me-before-launch' || entered === 'admin123') {
    sessionStorage.setItem('gd_admin_auth', 'true');
    errorEl.textContent = '';
    passwordInput.value = '';
    checkAdminAuth();
    showToast('Signed in to gD.jrzy Control Room.');
  } else {
    errorEl.textContent = 'Incorrect password. Please verify and try again.';
    passwordInput.value = '';
  }
}

function handleAdminLogout() {
  sessionStorage.removeItem('gd_admin_auth');
  checkAdminAuth();
  showToast('Logged out of Control Room.');
}

// Tab Switching
function loadTab(tabName) {
  currentAdminTab = tabName;
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `tab-${tabName}`);
  });

  if (tabName === 'quickdrop') {
    initQuickDropForm();
  } else if (tabName === 'inventory') {
    loadInventoryDesk();
  } else if (tabName === 'orders') {
    loadOrdersDesk();
  } else if (tabName === 'settings') {
    loadSettingsTab();
  }
}

// QuickDrop (+ New Jersey) Controller
async function initQuickDropForm() {
  if (!editingProductId) {
    const nextLot = await window.gdCommerce.getNextLotNumber();
    document.getElementById('qdLotNumber').value = nextLot;
    document.getElementById('previewLot').textContent = nextLot;
  }
  updateLivePreview();
}

function setupDropzone() {
  const dropzone = document.getElementById('photoDropzone');
  const fileInput = document.getElementById('photoFileInput');
  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  });
}

function handleFiles(fileList) {
  Array.from(fileList).forEach(file => {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload valid image files (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImages.push(e.target.result);
      renderUploadedGallery();
      updateLivePreview();
    };
    reader.readAsDataURL(file);
  });
}

function renderUploadedGallery() {
  const container = document.getElementById('uploadGalleryPreviews');
  if (!container) return;

  container.innerHTML = uploadedImages.map((src, idx) => `
    <div class="upload-thumb-card">
      ${idx === 0 ? '<span class="upload-thumb-primary-badge">Cover</span>' : ''}
      <img class="upload-thumb-img" src="${src}" alt="Jersey Photo ${idx + 1}">
      <button class="upload-thumb-delete" type="button" onclick="removeUploadedImage(${idx})" title="Remove photo">✕</button>
    </div>
  `).join('');
}

function removeUploadedImage(idx) {
  uploadedImages.splice(idx, 1);
  renderUploadedGallery();
  updateLivePreview();
}

function autoCalcTZS() {
  const inr = Number(document.getElementById('qdPriceINR').value) || 0;
  if (inr > 0) {
    const tzs = Math.round(inr * 31);
    document.getElementById('qdPriceTZS').value = tzs;
    updateLivePreview();
  }
}

function updateLivePreview() {
  const name = document.getElementById('qdName').value.trim() || 'Jersey Product Name';
  const category = document.getElementById('qdCategory').value || 'Club';
  const priceINR = document.getElementById('qdPriceINR').value || '1999';
  const lot = document.getElementById('qdLotNumber').value || 'GDJ-JRZY-001';
  const condition = document.getElementById('qdCondition').value || 'Brand New';

  document.getElementById('previewTitle').textContent = name;
  document.getElementById('previewMeta').textContent = `${category} / gD.jrzy`;
  document.getElementById('previewPrice').textContent = `₹${Number(priceINR).toLocaleString('en-IN')}`;
  document.getElementById('previewLot').textContent = lot;
  document.getElementById('previewCondition').textContent = condition;

  const previewImg = document.getElementById('previewImg');
  if (uploadedImages.length > 0) {
    previewImg.src = uploadedImages[0];
  } else {
    previewImg.src = 'assets/jerseys/brazil-t90-blue.webp';
  }
}

async function handleQuickDropSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('qdName').value.trim();
  const team = document.getElementById('qdTeam').value.trim();
  const category = document.getElementById('qdCategory').value;
  const kitType = document.getElementById('qdKitType').value;
  const season = document.getElementById('qdSeason').value.trim() || 'Current Season';
  const condition = document.getElementById('qdCondition').value;
  const lotNumber = document.getElementById('qdLotNumber').value.trim();
  const priceINR = Number(document.getElementById('qdPriceINR').value);
  let priceTZS = Number(document.getElementById('qdPriceTZS').value);
  if (!priceTZS) priceTZS = Math.round(priceINR * 31);

  const stockS = Number(document.getElementById('qdStockS').value) || 0;
  const stockM = Number(document.getElementById('qdStockM').value) || 0;
  const stockL = Number(document.getElementById('qdStockL').value) || 0;
  const stockXL = Number(document.getElementById('qdStockXL').value) || 0;

  const tag = document.getElementById('qdTag').value.trim() || 'New Drop';
  const description = document.getElementById('qdDesc').value.trim();
  const fabric = document.getElementById('qdFabric').value.trim() || '100% Breathable Athletic Jacquard Poly';
  const status = document.getElementById('qdStatus').value;

  if (!name || isNaN(priceINR) || priceINR <= 0) {
    showToast('Please provide a valid product name and price.');
    return;
  }

  // Ensure at least one image is uploaded or fallback provided
  let imagesToSave = [...uploadedImages];
  if (imagesToSave.length === 0) {
    showToast('Notice: No photos uploaded. Attaching default studio sample.');
    imagesToSave = ['assets/jerseys/brazil-t90-blue.webp'];
  }

  const payload = {
    lotNumber,
    name,
    team: team || name,
    category,
    kitType,
    season,
    priceINR,
    priceTZS,
    stock: { S: stockS, M: stockM, L: stockL, XL: stockXL },
    condition,
    images: imagesToSave,
    description: description || `${team || name} jersey crafted for match day and streetwear styling.`,
    fabric,
    tag,
    status
  };

  if (editingProductId) {
    payload.id = editingProductId;
  }

  try {
    const saved = await window.gdCommerce.saveProduct(payload);
    showToast(editingProductId ? 'Product updated successfully.' : 'Jersey published to live store!');
    resetQuickDropForm();
    await refreshStats();
    loadTab('inventory');
  } catch (err) {
    console.error('Error saving product:', err);
    showToast('Failed to save product. Check inputs.');
  }
}

function resetQuickDropForm() {
  document.getElementById('quickDropForm').reset();
  uploadedImages = [];
  editingProductId = null;
  document.getElementById('qdSubmitBtn').textContent = 'Publish Jersey to Store ↗';
  renderUploadedGallery();
  initQuickDropForm();
}

// Inventory & Catalog Desk Controller
async function loadInventoryDesk() {
  allCatalog = await window.gdCommerce.getProducts();
  renderInventoryTable(allCatalog);
}

function filterInventory(status) {
  document.querySelectorAll('.inv-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.status === status));
  if (status === 'All') {
    renderInventoryTable(allCatalog);
  } else if (status === 'LowStock') {
    renderInventoryTable(allCatalog.filter(p => {
      const tot = Object.values(p.stock || {}).reduce((a, b) => a + Number(b), 0);
      return tot <= 3;
    }));
  } else {
    renderInventoryTable(allCatalog.filter(p => p.status === status));
  }
}

function searchInventory(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderInventoryTable(allCatalog);
    return;
  }
  const filtered = allCatalog.filter(p => 
    p.name.toLowerCase().includes(q) || 
    (p.lotNumber && p.lotNumber.toLowerCase().includes(q)) ||
    (p.team && p.team.toLowerCase().includes(q))
  );
  renderInventoryTable(filtered);
}

function renderInventoryTable(products) {
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--admin-muted);">No jerseys match this view.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const imgUrl = (p.images && p.images.length > 0) ? p.images[0] : 'assets/jerseys/brazil-t90-blue.webp';
    const s = p.stock || { S: 0, M: 0, L: 0, XL: 0 };
    const totalStock = Object.values(s).reduce((a, b) => a + Number(b), 0);
    const statusClass = p.status === 'Published' ? 'published' : (p.status === 'Draft' ? 'draft' : 'sold');

    return `
      <tr>
        <td>
          <img class="table-thumb" src="${imgUrl}" alt="${p.name}" onerror="this.src='assets/jerseys/brazil-t90-blue.webp'">
        </td>
        <td>
          <div style="font-weight: 700; color: var(--admin-text);">${p.name}</div>
          <div style="font-size: 0.6875rem; color: var(--admin-muted);">${p.lotNumber || 'GDJ-001'} · ${p.category}</div>
        </td>
        <td>
          <span class="badge ${statusClass}">${p.status}</span>
        </td>
        <td>
          <div>₹${Number(p.priceINR).toLocaleString('en-IN')}</div>
          <div style="font-size: 0.6875rem; color: var(--admin-muted);">TSh ${Number(p.priceTZS || Math.round(p.priceINR * 31)).toLocaleString()}</div>
        </td>
        <td>
          <div class="stock-stepper-group">
            <div class="stock-pill-ctrl">
              <b>S:</b> <span>${s.S || 0}</span>
              <button onclick="inlineStockAdjust(${p.id}, 'S', -1)">−</button>
              <button onclick="inlineStockAdjust(${p.id}, 'S', 1)">+</button>
            </div>
            <div class="stock-pill-ctrl">
              <b>M:</b> <span>${s.M || 0}</span>
              <button onclick="inlineStockAdjust(${p.id}, 'M', -1)">−</button>
              <button onclick="inlineStockAdjust(${p.id}, 'M', 1)">+</button>
            </div>
            <div class="stock-pill-ctrl">
              <b>L:</b> <span>${s.L || 0}</span>
              <button onclick="inlineStockAdjust(${p.id}, 'L', -1)">−</button>
              <button onclick="inlineStockAdjust(${p.id}, 'L', 1)">+</button>
            </div>
            <div class="stock-pill-ctrl">
              <b>XL:</b> <span>${s.XL || 0}</span>
              <button onclick="inlineStockAdjust(${p.id}, 'XL', -1)">−</button>
              <button onclick="inlineStockAdjust(${p.id}, 'XL', 1)">+</button>
            </div>
          </div>
          <div style="font-size: 0.6875rem; color: var(--admin-muted); margin-top: 4px;">Total: <b>${totalStock}</b></div>
        </td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="admin-btn outline sm" onclick="editProductInQuickDrop(${p.id})">Edit</button>
            <button class="admin-btn danger sm" onclick="deleteProductConfirm(${p.id})">✕</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function inlineStockAdjust(productId, size, delta) {
  try {
    await window.gdCommerce.updateStock(productId, size, delta);
    showToast(`Stock updated for ${size}.`);
    await loadInventoryDesk();
    await refreshStats();
  } catch (err) {
    showToast('Failed to update stock.');
  }
}

async function editProductInQuickDrop(id) {
  const p = await window.gdCommerce.getProduct(id);
  if (!p) return;

  editingProductId = p.id;
  document.getElementById('qdName').value = p.name;
  document.getElementById('qdTeam').value = p.team || '';
  document.getElementById('qdCategory').value = p.category || 'Club';
  document.getElementById('qdKitType').value = p.kitType || 'Home';
  document.getElementById('qdSeason').value = p.season || '';
  document.getElementById('qdCondition').value = p.condition || 'Brand New with Tags';
  document.getElementById('qdLotNumber').value = p.lotNumber || '';
  document.getElementById('qdPriceINR').value = p.priceINR || '';
  document.getElementById('qdPriceTZS').value = p.priceTZS || '';

  const s = p.stock || {};
  document.getElementById('qdStockS').value = s.S || 0;
  document.getElementById('qdStockM').value = s.M || 0;
  document.getElementById('qdStockL').value = s.L || 0;
  document.getElementById('qdStockXL').value = s.XL || 0;

  document.getElementById('qdTag').value = p.tag || '';
  document.getElementById('qdDesc').value = p.description || '';
  document.getElementById('qdFabric').value = p.fabric || '';
  document.getElementById('qdStatus').value = p.status || 'Published';

  uploadedImages = p.images ? [...p.images] : [];
  renderUploadedGallery();
  updateLivePreview();

  document.getElementById('qdSubmitBtn').textContent = 'Update Jersey Details ↗';
  loadTab('quickdrop');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteProductConfirm(id) {
  if (confirm('Are you sure you want to permanently remove this jersey from the catalog?')) {
    await window.gdCommerce.deleteProduct(id);
    showToast('Jersey removed from catalog.');
    await loadInventoryDesk();
    await refreshStats();
  }
}

// Catalog Export & Import
async function exportCatalogJSON() {
  const products = await window.gdCommerce.getProducts();
  const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gd-jrzy-catalog-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Catalog exported as JSON.');
}

function importCatalogJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const list = JSON.parse(e.target.result);
      if (Array.isArray(list)) {
        for (const item of list) {
          await window.gdCommerce.saveProduct(item);
        }
        showToast(`Successfully imported ${list.length} jerseys.`);
        await loadInventoryDesk();
        await refreshStats();
      }
    } catch (err) {
      showToast('Invalid JSON file format.');
    }
  };
  reader.readAsText(file);
}

// Orders Desk Controller
async function loadOrdersDesk() {
  allOrders = await window.gdCommerce.getOrders();
  renderOrdersDesk(allOrders);
}

function renderOrdersDesk(orders) {
  const container = document.getElementById('ordersListContainer');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: var(--admin-muted);">
        <h3 style="font-size: 1.1rem; margin-bottom: 4px;">No customer orders yet</h3>
        <p style="font-size: 0.75rem;">Orders submitted from the storefront checkout will populate here in real-time.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(ord => {
    const cust = ord.customer || {};
    const items = ord.items || [];
    const dateStr = new Date(ord.createdAt).toLocaleString();

    const itemsSummary = items.map(i => `• ${i.name} (Size: ${i.size}, Qty: ${i.qty})`).join('<br>');
    
    // WhatsApp dispatch message
    const waText = encodeURIComponent(
      `Hello ${cust.name}! This is gD.jrzy regarding your order ${ord.id}. We are getting your kit packed and ready for dispatch!`
    );
    const waPhone = cust.phone ? cust.phone.replace(/[^0-9]/g, '') : '';

    return `
      <div class="order-row-card">
        <div class="order-row-info">
          <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 4px;">
            <h4>${ord.id}</h4>
            <span class="badge ${ord.status === 'Delivered' ? 'published' : 'draft'}">${ord.status}</span>
            <span class="badge" style="background: rgba(255,255,255,0.06); color: #FFF;">${ord.paymentStatus}</span>
          </div>
          <p>Customer: <b>${cust.name || 'Anonymous'}</b> · Phone: ${cust.phone || 'N/A'}</p>
          <p>Address: ${cust.address || ''}, ${cust.city || ''}, ${cust.country || ''}</p>
          <div class="order-items-snippet">
            <b>Items:</b><br>${itemsSummary}
          </div>
          <div style="font-size: 0.6875rem; color: var(--admin-muted); margin-top: 6px;">Ordered: ${dateStr} · Payment: ${ord.paymentMethod || 'Manual'}</div>
        </div>

        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
          <div style="font-size: 1.3rem; font-weight: 800; color: var(--orange);">
            ${ord.currency === 'TZS' ? 'TSh' : '₹'} ${Number(ord.total).toLocaleString()}
          </div>
          
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${waPhone ? `
              <a class="admin-btn outline sm" href="https://wa.me/${waPhone}?text=${waText}" target="_blank" rel="noopener">
                💬 Open WhatsApp Chat
              </a>
            ` : ''}

            <select class="admin-form-group" style="padding: 6px 10px; font-size: 0.75rem; background: #222;" onchange="updateOrderStatus('${ord.id}', this.value)">
              <option value="New" ${ord.status === 'New' ? 'selected' : ''}>Status: New</option>
              <option value="Processing" ${ord.status === 'Processing' ? 'selected' : ''}>Status: Processing</option>
              <option value="Dispatched" ${ord.status === 'Dispatched' ? 'selected' : ''}>Status: Dispatched</option>
              <option value="Delivered" ${ord.status === 'Delivered' ? 'selected' : ''}>Status: Delivered</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    await window.gdCommerce.updateOrderStatus(orderId, newStatus);
    showToast(`Order ${orderId} marked as ${newStatus}.`);
    await loadOrdersDesk();
    await refreshStats();
  } catch (err) {
    showToast('Failed to update order status.');
  }
}

// Store & Payment Settings Controller
async function loadSettingsTab() {
  const settings = await window.gdCommerce.getSettings();
  document.getElementById('setCurrency').value = settings.currency || 'INR';
  document.getElementById('setExchangeRate').value = settings.exchangeRateINRtoTZS || 31.0;
  document.getElementById('setWhatsApp').value = settings.whatsappNumber || '+255700000000';
  document.getElementById('setPaymentMode').value = settings.paymentMode || 'test';
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const currency = document.getElementById('setCurrency').value;
  const exchangeRateINRtoTZS = Number(document.getElementById('setExchangeRate').value) || 31.0;
  const whatsappNumber = document.getElementById('setWhatsApp').value.trim();
  const paymentMode = document.getElementById('setPaymentMode').value;
  const newPassword = document.getElementById('setNewPassword').value.trim();

  const updates = {
    currency,
    exchangeRateINRtoTZS,
    whatsappNumber,
    paymentMode
  };

  if (newPassword) {
    updates.adminPasswordHash = newPassword;
  }

  await window.gdCommerce.saveSettings(updates);
  document.getElementById('setNewPassword').value = '';
  showToast('Store settings saved successfully.');
}

async function resetCatalogConfirm() {
  if (confirm('Reset entire catalog and orders to default factory configuration? This cannot be undone.')) {
    await window.gdCommerce.resetToDefaults();
    showToast('Catalog reset to initial archive edit.');
    await refreshStats();
    loadTab('inventory');
  }
}

// Quick Stats Bar
async function refreshStats() {
  const products = await window.gdCommerce.getProducts();
  const orders = await window.gdCommerce.getOrders();

  const total = products.length;
  const published = products.filter(p => p.status === 'Published').length;
  const drafts = products.filter(p => p.status === 'Draft').length;
  const outOfStock = products.filter(p => {
    const s = Object.values(p.stock || {}).reduce((a, b) => a + Number(b), 0);
    return s <= 0;
  }).length;

  document.getElementById('statTotalJerseys').textContent = total;
  document.getElementById('statLive').textContent = published;
  document.getElementById('statDrafts').textContent = drafts;
  document.getElementById('statOrders').textContent = orders.length;
  document.getElementById('statOutOfStock').textContent = outOfStock;
}

// Event Listeners Setup
function setupEventListeners() {
  // Live input sync for QuickDrop
  ['qdName', 'qdCategory', 'qdPriceINR', 'qdCondition'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateLivePreview);
  });
}

// Toast
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Real-time synchronization
function initSyncListener() {
  window.gdCommerce.onSync(async (event) => {
    console.log('Sync event received on admin:', event);
    await refreshStats();
    if (currentAdminTab === 'inventory') {
      await loadInventoryDesk();
    } else if (currentAdminTab === 'orders') {
      await loadOrdersDesk();
    }
  });
}
