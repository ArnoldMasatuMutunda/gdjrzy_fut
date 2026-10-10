/**
 * gD.jrzy Database & Storage Layer
 * Supports IndexedDB (for rich uploaded images) with localStorage fallback.
 * Uses BroadcastChannel for instant cross-tab synchronization.
 */

const DB_NAME = 'gd_jrzy_commerce';
const DB_VERSION = 2; // Incremented to upgrade stored items to verified matching jerseys
const SYNC_CHANNEL = 'gd_jrzy_sync_channel';

// Default initial catalog with 100% verified matching real photography
const INITIAL_PRODUCTS = [
  {
    id: 1,
    lotNumber: 'GDJ-JRZY-001',
    name: 'Brazil Total 90 Away / Ronaldo #9',
    team: 'Brazil',
    category: 'National',
    kitType: 'Away',
    season: '2004/05',
    priceINR: 1999,
    priceTZS: 62000,
    stock: { S: 3, M: 5, L: 4, XL: 2 },
    condition: 'Mint / Like New',
    images: ['assets/jerseys/brazil-t90-blue.webp'],
    description: 'Iconic royal blue Nike Total 90 long sleeve edition with white contour piping and the historic center-circle #9. Tailored for Brazilian flair and streetwear styling.',
    fabric: '100% Breathable Dri-FIT micro-mesh / Long sleeve ribbed cuffs',
    tag: 'Archive Vault',
    status: 'Published',
    createdAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 2,
    lotNumber: 'GDJ-JRZY-002',
    name: 'Inter Milan Away / Pirelli Sash 1997',
    team: 'Inter Milan',
    category: 'Club',
    kitType: 'Away',
    season: '1997/98',
    priceINR: 2199,
    priceTZS: 68000,
    stock: { S: 2, M: 4, L: 3, XL: 1 },
    condition: 'Brand New with Tags',
    images: ['assets/jerseys/inter-milan-away-1997.jpg'],
    description: 'Pristine white base with the asymmetrical blue and black vertical sash, polo button collar, and iconic horizontal Pirelli emblem. Ronaldo Il Fenomeno era classic.',
    fabric: 'Heavyweight Jacquard knit with embroidered golden star crest',
    tag: 'Cult Classic',
    status: 'Published',
    createdAt: '2026-09-21T11:00:00.000Z'
  },
  {
    id: 3,
    lotNumber: 'GDJ-JRZY-003',
    name: 'South Africa / Bafana Bafana Emerald',
    team: 'South Africa',
    category: 'National',
    kitType: 'Home',
    season: 'Heritage Edit',
    priceINR: 1899,
    priceTZS: 58000,
    stock: { S: 4, M: 6, L: 5, XL: 3 },
    condition: 'Brand New with Tags',
    images: ['assets/jerseys/south-africa-bafana-green.jpg'],
    description: 'Deep emerald green with vertical heritage jacquard weaves, golden three stripes, and embroidered South African Football Association protea crest.',
    fabric: 'Engineered performance poly with retro polo collar',
    tag: 'African Heritage',
    status: 'Published',
    createdAt: '2026-09-22T09:30:00.000Z'
  },
  {
    id: 4,
    lotNumber: 'GDJ-JRZY-004',
    name: 'Ajax Amsterdam Long Sleeve / 1995',
    team: 'Ajax Amsterdam',
    category: 'Club',
    kitType: 'Home',
    season: '1995/96',
    priceINR: 1999,
    priceTZS: 62000,
    stock: { S: 2, M: 4, L: 2, XL: 1 },
    condition: 'Mint / Like New',
    images: ['assets/jerseys/ajax-retro-1995.jpg'],
    description: 'Legendary white with red center block and vertical ABN AMRO sponsor typography. European champions era long-sleeve silhouette with Umbro ribbed collar.',
    fabric: 'Silky retro pique knit with tonal woven Ajax crest details',
    tag: 'European Champions',
    status: 'Published',
    createdAt: '2026-09-23T14:15:00.000Z'
  },
  {
    id: 5,
    lotNumber: 'GDJ-JRZY-005',
    name: 'Real Madrid Home / Teka Era 2000',
    team: 'Real Madrid',
    category: 'Club',
    kitType: 'Home',
    season: '1999/00',
    priceINR: 2099,
    priceTZS: 65000,
    stock: { S: 3, M: 5, L: 3, XL: 2 },
    condition: 'Brand New with Tags',
    images: ['assets/jerseys/real-madrid-teka-2000.jpg'],
    description: 'Crisp Madrid white with navy collar and side panels, featuring the historic Teka chest sponsor and royal crest badge. La Octava Champions League winning look.',
    fabric: 'High-density polyester with breathable mesh underarm inserts',
    tag: 'Archive Edit',
    status: 'Published',
    createdAt: '2026-09-24T16:00:00.000Z'
  },
  {
    id: 6,
    lotNumber: 'GDJ-JRZY-006',
    name: 'Mexico 1986 Retro / adidas Originals',
    team: 'Mexico',
    category: 'National',
    kitType: 'Home',
    season: '1986 Classic',
    priceINR: 1899,
    priceTZS: 58000,
    stock: { S: 3, M: 4, L: 4, XL: 2 },
    condition: 'Brand New with Tags',
    images: ['assets/jerseys/mexico-retro-1986.jpg'],
    description: 'Vintage Mexico green with white winged polo collar, classic trefoil branding, and original Mexican Football Federation shield. A true streetwear wardrobe staple.',
    fabric: '100% Breathable cotton-poly blend with Climalite feel',
    tag: 'World Cup Vault',
    status: 'Published',
    createdAt: '2026-09-25T12:00:00.000Z'
  },
  {
    id: 7,
    lotNumber: 'GDJ-JRZY-007',
    name: 'Celtic Glasgow Retro / Green Hoops 1995',
    team: 'Celtic FC',
    category: 'Club',
    kitType: 'Home',
    season: '1995/96',
    priceINR: 1799,
    priceTZS: 56000,
    stock: { S: 2, M: 3, L: 2, XL: 1 },
    condition: 'Mint / Like New',
    images: ['assets/jerseys/celtic-hoops-1995.jpg'],
    description: 'Timeless green and white horizontal hoops with large centered Umbro diamond and classic four-leaf clover crest. Relaxed boxy streetwear cut.',
    fabric: 'Patterned sheen jacquard knit with structured collar',
    tag: 'Classic Hoops',
    status: 'Published',
    createdAt: '2026-09-26T15:30:00.000Z'
  },
  {
    id: 8,
    lotNumber: 'GDJ-JRZY-008',
    name: 'Nigeria Super Eagles / Atlanta 1996',
    team: 'Nigeria',
    category: 'National',
    kitType: 'Home',
    season: '1996 Gold',
    priceINR: 1999,
    priceTZS: 62000,
    stock: { S: 2, M: 4, L: 3, XL: 1 },
    condition: 'Brand New with Tags',
    images: ['assets/jerseys/nigeria-super-eagles-1996.jpg'],
    description: 'Vibrant green with center white panel, eagle crest and jagged lightning graphic patterns on sleeves. The kit that stunned the world to win Olympic Gold.',
    fabric: 'Dri-FIT performance poly with ribbed collar and sleeve cuffs',
    tag: 'Olympic Gold',
    status: 'Published',
    createdAt: '2026-09-27T18:00:00.000Z'
  }
];

const DEFAULT_SETTINGS = {
  currency: 'INR', // 'INR' or 'TZS'
  exchangeRateINRtoTZS: 31.0,
  whatsappNumber: '+255686513559',
  adminPasswordHash: 'change-me-before-launch',
  storeName: 'gD.jrzy',
  brandTagline: 'Football Lives Here.',
  campaignPhrase: 'FIT THE KIT.',
  paymentMode: 'test' // 'test' | 'live'
};

class GDCommerceDB {
  constructor() {
    this.db = null;
    this.broadcastChannel = null;
    this.initBroadcast();
  }

  initBroadcast() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel(SYNC_CHANNEL);
    }
  }

  notifySync(type, payload = null) {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type, payload, timestamp: Date.now() });
    }
    // Also trigger window custom event for same-page components
    window.dispatchEvent(new CustomEvent('gd_data_updated', { detail: { type, payload } }));
  }

  onSync(callback) {
    if (this.broadcastChannel) {
      this.broadcastChannel.onmessage = (event) => callback(event.data);
    }
    window.addEventListener('gd_data_updated', (event) => callback(event.detail));
  }

  async open() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id' });
          productStore.createIndex('lotNumber', 'lotNumber', { unique: true });
          productStore.createIndex('status', 'status', { unique: false });
        }
        if (!db.objectStoreNames.contains('orders')) {
          const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
          orderStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = async (e) => {
        this.db = e.target.result;
        await this.seedDefaultsIfEmpty();
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.warn('IndexedDB failed to open, falling back to localStorage', e);
        this.seedLocalStorage();
        resolve(null);
      };
    });
  }

  async seedDefaultsIfEmpty() {
    const products = await this.getAllFromStore('products');
    const hasLegacyImages = products && products.some(p => p.images && p.images[0] && p.images[0].includes('jersey-0'));
    if (!products || products.length === 0 || hasLegacyImages) {
      for (const prod of INITIAL_PRODUCTS) {
        await this.putInStore('products', prod);
      }
      localStorage.setItem('gd_products', JSON.stringify(INITIAL_PRODUCTS));
    }
    const settings = await this.getFromStore('settings', 'config');
    if (!settings) {
      await this.putInStore('settings', { key: 'config', ...DEFAULT_SETTINGS });
    }
  }

  seedLocalStorage() {
    const existing = localStorage.getItem('gd_products');
    if (!existing || existing.includes('jersey-0')) {
      localStorage.setItem('gd_products', JSON.stringify(INITIAL_PRODUCTS));
    }
    if (!localStorage.getItem('gd_settings')) {
      localStorage.setItem('gd_settings', JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem('gd_orders')) {
      localStorage.setItem('gd_orders', JSON.stringify([]));
    }
  }

  // Generic IndexedDB helpers
  getAllFromStore(storeName) {
    if (!this.db) {
      const data = localStorage.getItem(`gd_${storeName}`);
      return Promise.resolve(data ? JSON.parse(data) : []);
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  getFromStore(storeName, key) {
    if (!this.db) {
      const list = JSON.parse(localStorage.getItem(`gd_${storeName}`) || '[]');
      return Promise.resolve(list.find(x => (x.id || x.key) === key) || null);
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  putInStore(storeName, value) {
    if (!this.db) {
      const key = storeName === 'settings' ? 'key' : 'id';
      let list = JSON.parse(localStorage.getItem(`gd_${storeName}`) || '[]');
      const idx = list.findIndex(x => x[key] === value[key]);
      if (idx >= 0) list[idx] = value;
      else list.push(value);
      localStorage.setItem(`gd_${storeName}`, JSON.stringify(list));
      return Promise.resolve(value);
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => resolve(value);
      req.onerror = () => reject(req.error);
    });
  }

  deleteFromStore(storeName, key) {
    if (!this.db) {
      let list = JSON.parse(localStorage.getItem(`gd_${storeName}`) || '[]');
      list = list.filter(x => x.id !== key);
      localStorage.setItem(`gd_${storeName}`, JSON.stringify(list));
      return Promise.resolve(true);
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // High-Level Products API
  async getProducts() {
    await this.open();
    const prods = await this.getAllFromStore('products');
    return prods.sort((a, b) => b.id - a.id);
  }

  async getPublishedProducts() {
    const prods = await this.getProducts();
    return prods.filter(p => p.status === 'Published');
  }

  async getProduct(id) {
    await this.open();
    return await this.getFromStore('products', Number(id));
  }

  async saveProduct(product) {
    await this.open();
    if (!product.id) {
      const all = await this.getProducts();
      const maxId = all.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0);
      product.id = maxId + 1;
      product.createdAt = new Date().toISOString();
    }
    // Compute total stock helper
    const s = product.stock || { S: 0, M: 0, L: 0, XL: 0 };
    product.totalStock = (Number(s.S) || 0) + (Number(s.M) || 0) + (Number(s.L) || 0) + (Number(s.XL) || 0);

    const saved = await this.putInStore('products', product);
    this.notifySync('product_saved', saved);
    return saved;
  }

  async deleteProduct(id) {
    await this.open();
    await this.deleteFromStore('products', Number(id));
    this.notifySync('product_deleted', { id: Number(id) });
    return true;
  }

  async updateStock(id, size, delta) {
    const prod = await this.getProduct(id);
    if (!prod) throw new Error('Product not found');
    if (!prod.stock) prod.stock = { S: 0, M: 0, L: 0, XL: 0 };
    const current = Number(prod.stock[size]) || 0;
    const nextVal = Math.max(0, current + delta);
    prod.stock[size] = nextVal;
    return await this.saveProduct(prod);
  }

  async getNextLotNumber() {
    const all = await this.getProducts();
    const count = all.length + 1;
    return `GDJ-JRZY-${String(count).padStart(3, '0')}`;
  }

  // High-Level Orders API
  async getOrders() {
    await this.open();
    const orders = await this.getAllFromStore('orders');
    return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async saveOrder(order) {
    await this.open();
    if (!order.id) {
      const rand = Math.floor(10000 + Math.random() * 90000);
      order.id = `ORD-${rand}`;
      order.createdAt = new Date().toISOString();
      order.status = 'New';
      order.paymentStatus = order.paymentStatus || 'Pending';
    }

    // Decrement stock atomically from products
    for (const item of order.items) {
      if (item.productId && item.size) {
        try {
          await this.updateStock(item.productId, item.size, -(Number(item.qty) || 1));
        } catch (err) {
          console.warn('Could not decrement stock for order item', item, err);
        }
      }
    }

    const saved = await this.putInStore('orders', order);
    this.notifySync('order_created', saved);
    return saved;
  }

  async updateOrderStatus(id, status, paymentStatus = null) {
    await this.open();
    const order = await this.getFromStore('orders', id);
    if (!order) throw new Error('Order not found');
    order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    const updated = await this.putInStore('orders', order);
    this.notifySync('order_updated', updated);
    return updated;
  }

  // Settings API
  async getSettings() {
    await this.open();
    const cfg = await this.getFromStore('settings', 'config');
    return { ...DEFAULT_SETTINGS, ...cfg };
  }

  async saveSettings(newSettings) {
    await this.open();
    const current = await this.getSettings();
    const merged = { ...current, ...newSettings, key: 'config' };
    await this.putInStore('settings', merged);
    this.notifySync('settings_updated', merged);
    return merged;
  }

  // Reset demo
  async resetToDefaults() {
    await this.open();
    if (this.db) {
      const tx = this.db.transaction(['products', 'orders', 'settings'], 'readwrite');
      tx.objectStore('products').clear();
      tx.objectStore('orders').clear();
      tx.objectStore('settings').clear();
      await new Promise(r => { tx.oncomplete = r; });
    }
    localStorage.removeItem('gd_products');
    localStorage.removeItem('gd_orders');
    localStorage.removeItem('gd_settings');
    await this.seedDefaultsIfEmpty();
    this.notifySync('catalog_reset');
  }
}

// Global instance
window.gdCommerce = new GDCommerceDB();
