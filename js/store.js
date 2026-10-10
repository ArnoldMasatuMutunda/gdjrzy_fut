/**
 * gD.jrzy — Storefront Controller
 * Manages product rendering, filtering, hero carousel, product modal,
 * shopping bag drawer, checkout flow, and real-time database synchronization.
 */

let allProducts = [];
let filteredProducts = [];
let activeCurrency = 'INR'; // 'INR' or 'TZS'
let activeFilter = 'All';
let searchQuery = '';
let currentHeroIndex = 0;
let heroCarouselTimer = null;
let currentModalProduct = null;
let selectedModalSize = 'M';
let cart = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  loadSavedCart();
  await syncSettings();
  await loadCatalog();
  initHeroCarousel();
  initSyncListener();
});

// Settings & Currency
async function syncSettings() {
  const settings = await window.gdCommerce.getSettings();
  const savedCur = localStorage.getItem('gd_active_currency');
  if (savedCur) {
    activeCurrency = savedCur;
  } else if (settings.currency) {
    activeCurrency = settings.currency;
  }
  updateCurrencyUI();
}

function setCurrency(cur) {
  activeCurrency = cur;
  localStorage.setItem('gd_active_currency', cur);
  updateCurrencyUI();
  renderProducts();
  renderHeroCarousel();
  renderCart();
  if (currentModalProduct) {
    updateModalPrice();
  }
}

function updateCurrencyUI() {
  document.querySelectorAll('.currency-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.currency === activeCurrency);
  });
}

function formatMoney(inr, tzs) {
  if (activeCurrency === 'TZS') {
    const val = tzs || Math.round(inr * 31.0);
    return `TSh ${Number(val).toLocaleString('en-US')}`;
  }
  return `₹${Number(inr).toLocaleString('en-IN')}`;
}

// Catalog Loading & Rendering
async function loadCatalog() {
  allProducts = await window.gdCommerce.getPublishedProducts();
  applyFilters();
}

function applyFilters() {
  filteredProducts = allProducts.filter(p => {
    const matchCat = activeFilter === 'All' || p.category === activeFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || 
      p.name.toLowerCase().includes(q) || 
      (p.team && p.team.toLowerCase().includes(q)) ||
      (p.lotNumber && p.lotNumber.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });
  renderProducts();
}

function setFilter(cat) {
  activeFilter = cat;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === cat);
  });
  applyFilters();
}

function handleSearch(query) {
  searchQuery = query;
  applyFilters();
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #777;">
        <h3 style="font-size: 1.3rem; margin-bottom: 8px;">No jerseys match this filter</h3>
        <p style="font-size: 0.875rem;">Try another search term or explore all collections.</p>
        <button class="pill dark sm" style="margin-top: 16px;" onclick="setFilter('All')">View all kits ↗</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredProducts.map(p => {
    const imgUrl = (p.images && p.images.length > 0) ? p.images[0] : 'assets/jerseys/brazil-t90-blue.webp';
    const totalStock = p.totalStock !== undefined ? p.totalStock : Object.values(p.stock || {}).reduce((a, b) => a + Number(b), 0);
    const isSoldOut = totalStock <= 0;

    // Size pills
    const sizes = ['S', 'M', 'L', 'XL'];
    const sizePills = sizes.map(s => {
      const count = (p.stock && p.stock[s]) || 0;
      return `<span class="size-pill-badge ${count <= 0 ? 'out-of-stock' : ''}">${s}</span>`;
    }).join('');

    return `
      <article class="product-card" data-id="${p.id}">
        <div class="product-img-wrap">
          <span class="product-tag">${isSoldOut ? 'Sold Out' : (p.tag || p.category)}</span>
          <span class="product-lot-badge">${p.lotNumber || 'GDJ-001'}</span>
          <img class="product-real-img" src="${imgUrl}" alt="${p.name}" loading="lazy" onerror="this.src='assets/jerseys/brazil-t90-blue.webp'">
          <button class="product-quick-view" onclick="openProductModal(${p.id})">
            ${isSoldOut ? 'View Details' : 'Select Size ↗'}
          </button>
        </div>
        <div class="product-meta">
          <div class="product-meta-header">
            <h3 class="product-name">${p.name}</h3>
            <span class="product-price">${formatMoney(p.priceINR, p.priceTZS)}</span>
          </div>
          <div class="product-details-sub">${p.category} · ${p.season || 'Current Season'}</div>
          <div class="product-sizes-row">
            ${sizePills}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// Hero Carousel
function initHeroCarousel() {
  renderHeroCarousel();
  if (heroCarouselTimer) clearInterval(heroCarouselTimer);
  heroCarouselTimer = setInterval(() => {
    if (allProducts.length > 0) {
      currentHeroIndex = (currentHeroIndex + 1) % Math.min(5, allProducts.length);
      renderHeroCarousel();
    }
  }, 5000);
}

function renderHeroCarousel() {
  const container = document.getElementById('heroArt');
  if (!container || allProducts.length === 0) return;

  const topItems = allProducts.slice(0, 5);
  const p = topItems[currentHeroIndex] || allProducts[0];
  const imgUrl = (p.images && p.images.length > 0) ? p.images[0] : 'assets/jerseys/brazil-t90-blue.webp';

  container.innerHTML = `
    <div class="hero-card" onclick="openProductModal(${p.id})">
      <span class="hero-badge">${p.tag || 'Season Archive'}</span>
      <img class="hero-card-img" src="${imgUrl}" alt="${p.name}" onerror="this.src='assets/jerseys/brazil-t90-blue.webp'">
      <div class="hero-card-info">
        <div>
          <h3>${p.name}</h3>
          <p>${p.team || 'Football Culture'} · ${p.lotNumber || 'GDJ-001'}</p>
        </div>
        <div class="hero-card-price">${formatMoney(p.priceINR, p.priceTZS)}</div>
      </div>
    </div>
    <div class="hero-carousel-controls">
      ${topItems.map((item, idx) => `
        <button class="carousel-dot ${idx === currentHeroIndex ? 'active' : ''}" 
          onclick="setHeroIndex(${idx})" aria-label="Slide ${idx + 1}"></button>
      `).join('')}
    </div>
  `;
}

function setHeroIndex(idx) {
  currentHeroIndex = idx;
  renderHeroCarousel();
  if (heroCarouselTimer) clearInterval(heroCarouselTimer);
  heroCarouselTimer = setInterval(() => {
    if (allProducts.length > 0) {
      currentHeroIndex = (currentHeroIndex + 1) % Math.min(5, allProducts.length);
      renderHeroCarousel();
    }
  }, 5000);
}

// Product Detail Modal
async function openProductModal(id) {
  const p = await window.gdCommerce.getProduct(id);
  if (!p) return;
  currentModalProduct = p;

  document.getElementById('modalLot').textContent = `${p.lotNumber || 'GDJ-001'} · ${p.category} / gD.jrzy`;
  document.getElementById('modalTitle').textContent = p.name;
  updateModalPrice();
  document.getElementById('modalDesc').textContent = p.description || 'A statement jersey designed for match days and everyday city streetwear.';
  document.getElementById('modalFabric').textContent = p.fabric || '100% Breathable Athletic Jacquard Poly';
  document.getElementById('modalCondition').textContent = p.condition || 'Brand New';

  // Gallery
  const images = (p.images && p.images.length > 0) ? p.images : ['assets/jerseys/brazil-t90-blue.webp'];
  const mainImg = document.getElementById('modalMainImg');
  mainImg.src = images[0];

  const thumbsContainer = document.getElementById('modalThumbnails');
  thumbsContainer.innerHTML = images.map((img, idx) => `
    <div class="modal-thumb ${idx === 0 ? 'active' : ''}" onclick="setModalMainImg('${img}', this)">
      <img src="${img}" alt="Thumbnail ${idx + 1}" onerror="this.src='assets/jerseys/brazil-t90-blue.webp'">
    </div>
  `).join('');

  // Sizes setup
  const stock = p.stock || { S: 0, M: 0, L: 0, XL: 0 };
  const sizeBtns = document.querySelectorAll('.size-btn');
  let firstAvailableSize = null;

  sizeBtns.forEach(btn => {
    const s = btn.dataset.size;
    const qty = Number(stock[s]) || 0;
    btn.disabled = qty <= 0;
    if (qty > 0 && !firstAvailableSize) {
      firstAvailableSize = s;
    }
  });

  selectedModalSize = firstAvailableSize || 'M';
  sizeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === selectedModalSize);
    btn.onclick = () => selectModalSize(btn.dataset.size);
  });

  updateModalStockUI();

  // WhatsApp inquiry URL setup
  updateWhatsAppInquiryLink();

  document.getElementById('productModalBackdrop').classList.add('open');
}

function updateModalPrice() {
  if (!currentModalProduct) return;
  document.getElementById('modalPrice').textContent = formatMoney(currentModalProduct.priceINR, currentModalProduct.priceTZS);
}

function setModalMainImg(src, thumbEl) {
  document.getElementById('modalMainImg').src = src;
  document.querySelectorAll('.modal-thumb').forEach(t => t.classList.remove('active'));
  if (thumbEl) thumbEl.classList.add('active');
}

function selectModalSize(size) {
  selectedModalSize = size;
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === size);
  });
  updateModalStockUI();
  updateWhatsAppInquiryLink();
}

function updateModalStockUI() {
  if (!currentModalProduct) return;
  const stock = currentModalProduct.stock || {};
  const qty = Number(stock[selectedModalSize]) || 0;
  const indicator = document.getElementById('modalStockIndicator');
  const addBtn = document.getElementById('modalAddCartBtn');

  if (qty <= 0) {
    indicator.textContent = `Size ${selectedModalSize} is currently sold out.`;
    indicator.className = 'stock-indicator out-of-stock';
    addBtn.disabled = true;
    addBtn.textContent = 'Sold Out in this Size';
  } else if (qty <= 2) {
    indicator.textContent = `Only ${qty} left in Size ${selectedModalSize} — Reserve yours now.`;
    indicator.className = 'stock-indicator low-stock';
    addBtn.disabled = false;
    addBtn.textContent = 'Add to Bag ↗';
  } else {
    indicator.textContent = `In Stock (${qty} available in Size ${selectedModalSize})`;
    indicator.className = 'stock-indicator in-stock';
    addBtn.disabled = false;
    addBtn.textContent = 'Add to Bag ↗';
  }
}

function updateWhatsAppInquiryLink() {
  if (!currentModalProduct) return;
  const btn = document.getElementById('modalWhatsAppBtn');
  if (!btn) return;

  const phone = '255700000000'; // Standard merchant contact
  const message = encodeURIComponent(
    `Hello gD.jrzy! I'm interested in the "${currentModalProduct.name}" (Lot: ${currentModalProduct.lotNumber || 'N/A'}, Size: ${selectedModalSize}, Price: ${formatMoney(currentModalProduct.priceINR, currentModalProduct.priceTZS)}). Is it ready for dispatch?`
  );
  btn.href = `https://wa.me/${phone}?text=${message}`;
}

function closeProductModal() {
  document.getElementById('productModalBackdrop').classList.remove('open');
  currentModalProduct = null;
}

// Shopping Bag
function loadSavedCart() {
  const saved = localStorage.getItem('gd_cart');
  if (saved) {
    try {
      cart = JSON.parse(saved);
    } catch (e) {
      cart = [];
    }
  }
  renderCart();
}

function saveCart() {
  localStorage.setItem('gd_cart', JSON.stringify(cart));
  renderCart();
}

function addToCartFromModal() {
  if (!currentModalProduct) return;
  const stock = currentModalProduct.stock || {};
  const available = Number(stock[selectedModalSize]) || 0;

  if (available <= 0) {
    showToast(`Size ${selectedModalSize} is out of stock.`);
    return;
  }

  const existing = cart.find(x => x.id === currentModalProduct.id && x.size === selectedModalSize);
  if (existing) {
    if (existing.qty >= available) {
      showToast(`Only ${available} items in stock for Size ${selectedModalSize}.`);
      return;
    }
    existing.qty += 1;
  } else {
    const img = (currentModalProduct.images && currentModalProduct.images.length > 0) ? currentModalProduct.images[0] : 'assets/jerseys/brazil-t90-blue.webp';
    cart.push({
      id: currentModalProduct.id,
      lotNumber: currentModalProduct.lotNumber,
      name: currentModalProduct.name,
      size: selectedModalSize,
      priceINR: currentModalProduct.priceINR,
      priceTZS: currentModalProduct.priceTZS,
      image: img,
      qty: 1
    });
  }

  saveCart();
  closeProductModal();
  toggleCart(true);
  showToast(`Added to your bag.`);
}

function updateCartItemQty(id, size, delta) {
  const item = cart.find(x => x.id === id && x.size === size);
  if (!item) return;

  const newQty = item.qty + delta;
  if (newQty <= 0) {
    removeFromCart(id, size);
  } else {
    // Check product stock limit
    const prod = allProducts.find(p => p.id === id);
    if (prod && prod.stock && newQty > (prod.stock[size] || 0)) {
      showToast(`Maximum stock limit reached.`);
      return;
    }
    item.qty = newQty;
    saveCart();
  }
}

function removeFromCart(id, size) {
  cart = cart.filter(x => !(x.id === id && x.size === size));
  saveCart();
  showToast(`Removed from bag.`);
}

function renderCart() {
  const countEl = document.getElementById('navCartCount');
  const drawerCountEl = document.getElementById('drawerCartCount');
  const itemsContainer = document.getElementById('cartItemsList');
  const subtotalEl = document.getElementById('cartSubtotal');

  const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
  if (countEl) countEl.textContent = totalCount;
  if (drawerCountEl) drawerCountEl.textContent = totalCount;

  if (!itemsContainer) return;

  if (cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="cart-empty-message">
        <p style="font-size: 1rem; font-weight: 600; margin-bottom: 6px;">Your bag is empty.</p>
        <p style="font-size: 0.75rem; color: #888;">Explore the archive and fit your kit.</p>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = formatMoney(0, 0);
    return;
  }

  let inrTotal = 0;
  let tzsTotal = 0;

  itemsContainer.innerHTML = cart.map(item => {
    const itemTotalINR = item.priceINR * item.qty;
    const itemTotalTZS = (item.priceTZS || Math.round(item.priceINR * 31)) * item.qty;
    inrTotal += itemTotalINR;
    tzsTotal += itemTotalTZS;

    return `
      <div class="cart-item-row">
        <img class="cart-item-img" src="${item.image}" alt="${item.name}" onerror="this.src='assets/jerseys/brazil-t90-blue.webp'">
        <div class="cart-item-details">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-meta">Size: <b>${item.size}</b> · ${item.lotNumber || 'GDJ'}</div>
          <div class="cart-item-price">${formatMoney(itemTotalINR, itemTotalTZS)}</div>
          <div class="cart-qty-ctrl">
            <button class="cart-qty-btn" onclick="updateCartItemQty(${item.id}, '${item.size}', -1)">−</button>
            <span style="font-size: 0.8125rem; font-weight: 700;">${item.qty}</span>
            <button class="cart-qty-btn" onclick="updateCartItemQty(${item.id}, '${item.size}', 1)">+</button>
            <button class="cart-item-remove" onclick="removeFromCart(${item.id}, '${item.size}')">Remove</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (subtotalEl) {
    subtotalEl.textContent = formatMoney(inrTotal, tzsTotal);
  }
}

function toggleCart(open) {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartBackdrop');
  if (drawer) drawer.classList.toggle('open', open);
  if (backdrop) backdrop.classList.toggle('open', open);
}

// Checkout Flow
function openCheckoutModal() {
  if (cart.length === 0) {
    showToast('Your bag is empty.');
    return;
  }
  toggleCart(false);

  // Compute total
  let inrTotal = 0;
  let tzsTotal = 0;
  cart.forEach(item => {
    inrTotal += item.priceINR * item.qty;
    tzsTotal += (item.priceTZS || Math.round(item.priceINR * 31)) * item.qty;
  });

  document.getElementById('checkoutSummaryTotal').textContent = formatMoney(inrTotal, tzsTotal);
  document.getElementById('checkoutSummaryCount').textContent = `${cart.reduce((s, i) => s + i.qty, 0)} Items`;

  document.getElementById('checkoutModalBackdrop').classList.add('open');
}

function closeCheckoutModal() {
  document.getElementById('checkoutModalBackdrop').classList.remove('open');
}

function selectPaymentMethod(method, cardEl) {
  document.querySelectorAll('.payment-option-card').forEach(c => c.classList.remove('selected'));
  if (cardEl) cardEl.classList.add('selected');
  document.getElementById('selectedPaymentMethodInput').value = method;
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const email = document.getElementById('custEmail').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const city = document.getElementById('custCity').value.trim();
  const country = document.getElementById('custCountry').value;
  const paymentMethod = document.getElementById('selectedPaymentMethodInput').value;

  if (!name || !phone || !address || !city) {
    showToast('Please complete all required shipping fields.');
    return;
  }

  let totalAmount = 0;
  cart.forEach(item => {
    totalAmount += activeCurrency === 'TZS' ? (item.priceTZS || Math.round(item.priceINR * 31)) * item.qty : item.priceINR * item.qty;
  });

  const orderPayload = {
    customer: { name, phone, email, address, city, country },
    items: [...cart],
    total: totalAmount,
    currency: activeCurrency,
    paymentMethod: paymentMethod,
    paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Pending Verification'
  };

  try {
    const savedOrder = await window.gdCommerce.saveOrder(orderPayload);
    
    // Clear cart
    cart = [];
    saveCart();
    closeCheckoutModal();

    // Show confirmation modal
    openOrderSuccessModal(savedOrder);
  } catch (err) {
    console.error('Checkout error:', err);
    showToast('Failed to place order. Please try again.');
  }
}

function openOrderSuccessModal(order) {
  document.getElementById('successOrderId').textContent = order.id;
  document.getElementById('successOrderTotal').textContent = activeCurrency === 'TZS' ? `TSh ${order.total.toLocaleString()}` : `₹${order.total.toLocaleString()}`;

  // Build WhatsApp receipt dispatch link
  const itemSummary = order.items.map(i => `• ${i.name} (Size: ${i.size}, Qty: ${i.qty})`).join('\n');
  const waMsg = encodeURIComponent(
    `*gD.jrzy ORDER CONFIRMATION*\n` +
    `Order ID: ${order.id}\n` +
    `Customer: ${order.customer.name}\n` +
    `Phone: ${order.customer.phone}\n` +
    `Delivery: ${order.customer.address}, ${order.customer.city}, ${order.customer.country}\n` +
    `Total: ${order.currency} ${order.total}\n\n` +
    `Items:\n${itemSummary}\n\n` +
    `Please confirm my order dispatch!`
  );

  const waBtn = document.getElementById('successWhatsAppBtn');
  if (waBtn) {
    waBtn.href = `https://wa.me/255700000000?text=${waMsg}`;
  }

  document.getElementById('orderSuccessModalBackdrop').classList.add('open');
}

function closeOrderSuccessModal() {
  document.getElementById('orderSuccessModalBackdrop').classList.remove('open');
}

// Newsletter Drop List
function handleNewsletter(e) {
  e.preventDefault();
  const input = e.target.querySelector('input[type="email"]');
  if (input && input.value) {
    showToast('You are on the drop list. First to the next archive find!');
    input.value = '';
  }
}

// Toast System
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

// Cross-tab real-time sync
function initSyncListener() {
  window.gdCommerce.onSync(async (event) => {
    console.log('Sync event received on storefront:', event);
    await loadCatalog();
    renderHeroCarousel();
  });
}
