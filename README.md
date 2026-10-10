# gD.jrzy — Football Lives Here.
**Official Online Store & Standalone Control Room for Garment District**

> **Tagline:** Football Lives Here.  
> **Campaign:** FIT THE KIT.  
> **Instagram:** [@gd.jrzy](https://instagram.com/gd.jrzy)  
> **Brand Concept:** Football jerseys as fashion, culture, identity, and everyday streetwear.

---

## 1. Project Overview & Architecture

This project is the production-ready implementation of **gD.jrzy**, the football jersey department of Garment District.

### Key Architecture Features
1. **Isolated Client Storefront & Admin Portal (Not on the same page)**:
   - **Client Storefront (`/` or `index.html`)**: Complete luxury streetwear editorial shopping experience with hero carousel, filters, search, quick view modal, multi-photo gallery, shopping bag, and checkout.
   - **Control Room Admin Portal (`/admin` or `admin.html`)**: Protected, dedicated administrative interface featuring QuickDrop photo uploads, per-size inventory tracking (S, M, L, XL), customer order fulfillment, and WhatsApp receipt routing.
2. **Real Photography (No SVG or placeholder images)**:
   - Admin uploads actual physical jersey photos (Front, Back, Tags, Details).
   - Photos are stored persistently and synchronized directly to the public shop.
   - Initial catalog is pre-loaded with high-resolution real football jersey photographs from the archive.
3. **Multi-Market Support (India & Tanzania)**:
   - Currency toggle supporting **INR (₹)** and **TZS (TSh)** with automated conversion helpers.
4. **Instant WhatsApp Order & Dispatch**:
   - Customers can inquire directly or dispatch complete order receipts to merchant WhatsApp with one click.
   - Admin can open customer WhatsApp chats directly from the Orders desk.
5. **Vercel & GitHub Ready**:
   - Configured with `vercel.json` for clean URL routing (`/` and `/admin`), asset caching, and security headers.

---

## 2. Directory Structure

```text
├── index.html                     # Customer Storefront (Home, Shop, Bag, Checkout)
├── admin.html                     # Standalone Admin Portal (Protected Control Room)
├── vercel.json                    # Vercel deployment configuration & route rewrites
├── package.json                   # Project metadata & npm scripts
├── .gitignore                     # Git ignore rules
├── css/
│   ├── store.css                  # Editorial storefront design system
│   └── admin.css                  # Obsidian dark mode admin control styling
├── js/
│   ├── db.js                      # Persistent IndexedDB/localStorage & sync engine
│   ├── store.js                   # Client storefront interactive controller
│   └── admin.js                   # Admin QuickDrop, inventory & orders controller
└── assets/
    ├── brand/                     # Official gD.jrzy logo vectors & campaign images
    │   ├── logo-primary.svg
    │   ├── logo-reversed.svg
    │   ├── logo-badge.svg
    │   ├── campaign-fit-the-kit.jpg
    │   └── manifesto-culture.jpg
    └── jerseys/                   # Real photography vault for catalog jerseys
        ├── brazil-t90-blue.webp
        ├── inter-milan-away-1997.jpg
        ├── south-africa-bafana-green.jpg
        ├── ajax-retro-1995.jpg
        ├── real-madrid-teka-2000.jpg
        ├── mexico-retro-1986.jpg
        ├── celtic-hoops-1995.jpg
        └── nigeria-super-eagles-1996.jpg
```

---

## 3. How to Run Locally

You can run the store locally using any local web server:

### Option A: Using Python (Built-in)
```bash
python -m http.server 8080
```
- Open Storefront: `http://localhost:8080/index.html`
- Open Admin Portal: `http://localhost:8080/admin.html`

### Option B: Using Node / npx
```bash
npx serve .
```

---

## 4. Admin Access & QuickDrop Workflow

1. Open `admin.html` (or `/admin` on Vercel).
2. Enter the admin password:
   - **Default Password:** `change-me-before-launch`
   *(You can change this password at any time in the Settings tab).*
3. **QuickDrop (+ New Jersey) Intake**:
   - Drag and drop your real jersey photos into the dropzone (or select from files).
   - Enter Jersey Name, Team, Category, and Kit Type.
   - The lot number (`GDJ-JRZY-XXX`) is automatically incremented.
   - Enter Indian Rupee price (INR ₹) and click **Auto** to calculate Tanzanian Shillings (TZS TSh).
   - Allocate physical stock counts for sizes **S, M, L, and XL**.
   - Review the **Live Card Preview** on the right side.
   - Click **Publish Jersey to Store ↗**.
4. The jersey will immediately appear on the storefront!

---

## 5. Step-by-Step: Deploy to GitHub & Vercel

### Step 1: Initialize Git and Commit
Open terminal / PowerShell in this directory:
```bash
git init
git add .
git commit -m "feat: complete gD.jrzy storefront and standalone admin portal"
```

### Step 2: Push to GitHub
1. Go to [GitHub](https://github.com) and click **New Repository**.
2. Name it `gd-jrzy` (set to Public or Private).
3. Do **not** initialize with a README (one is already created).
4. Run the commands shown by GitHub:
```bash
git remote add origin https://github.com/YOUR_USERNAME/gd-jrzy.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Vercel (1-Click Import)
1. Go to [Vercel](https://vercel.com) and log in.
2. Click **Add New...** → **Project**.
3. Under **Import Git Repository**, select your `gd-jrzy` repository.
4. Framework Preset: Leave as **Other** (Static Site).
5. Root Directory: `./` (default).
6. Click **Deploy**.

Vercel will build and deploy your site in less than 30 seconds.

### Clean URLs on Vercel:
- Public Storefront: `https://your-domain.vercel.app/`
- Private Admin Portal: `https://your-domain.vercel.app/admin`

---

## 6. Testing & Quality Assurance Checklist

- [x] **Storefront Layout**: High-contrast typography (`Playfair Display`), bone background, signal orange accents.
- [x] **Real Photography**: All kits use real photos; zero SVG placeholders.
- [x] **Separation of Concerns**: Client storefront (`index.html`) and admin portal (`admin.html`) are isolated on separate pages.
- [x] **Hero Carousel**: 5-slide featured kits with thumbnails and live prices.
- [x] **Category Filters**: All Kits, Club Kits, National Teams, Classics & Retro.
- [x] **Quick View Modal**: Multi-image thumbnail gallery, size-specific stock availability indicator, fabric notes.
- [x] **Shopping Bag**: Size selection, quantity stepper, stock limits, persistent state.
- [x] **Checkout Flow**: Customer details, country selection, payment method choices, order ID generation.
- [x] **WhatsApp Integration**: Direct pre-filled inquiries and order confirmation dispatch.
- [x] **Admin QuickDrop**: Multi-photo upload, lot numbering, size stock breakdown, live card preview.
- [x] **Inventory Desk**: Inline size stepper controls (`+ / -`) for instant stock adjustments.
- [x] **Orders Desk**: Live customer orders table with one-click WhatsApp chat link.
- [x] **Real-Time Sync**: Uses `BroadcastChannel` so admin changes update the storefront live across tabs.
- [x] **Vercel Config**: `vercel.json` provides clean rewrites for `/` and `/admin`.
