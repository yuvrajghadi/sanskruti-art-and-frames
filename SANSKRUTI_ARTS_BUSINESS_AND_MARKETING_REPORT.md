# Sanskruti Arts Atelier — Complete Product, Business & Marketing Dossier

**Prepared For:** Marketing Team & Business / Sales Development Team  
**Platform:** Sanskruti Arts Custom Framing Studio & Moulding Catalogue (`index.html`: *Sanskruti Arts Atelier — Luxury Custom Framing & Moulding Manufacturer*)  
**Manufacturing Base:** Mumbai & Gujarat, India (`Mon – Sat, 9:30 AM – 7:00 PM IST`)  
**Tax & Trade Classification:** Indian Domestic Pricing (`INR`), HSN `4414` (`18%` Provisional GST Estimate)  

---

## 1. Executive Summary & Market Positioning

**Sanskruti Arts Atelier** is not just a static online catalogue—it is a dual-purpose **digital showroom and B2B/B2C custom framing configurator** built specifically for the Indian art, interior design, and framing trade market.

### Core Unique Selling Proposition (USP)
> **"Heritage Indian Craftsmanship × Architectural-Grade 2D/3D Framing Precision"**

Unlike conventional framing shops or generic e-commerce marketplaces that show flat thumbnail photos and vague pricing, the platform empowers homeowners, art collectors, interior architects, and wholesale buyers to:
1. **Upload their own artwork/photo** (or test with curated built-in samples) directly in the browser.
2. **Switch live between a 2D Architectural CAD Blueprint** (showing exact outer dimensions, sightline, mat borders, and exploded corner joints) **and an Interactive 3D WebGL Studio** (with real-time Three.js lighting, wood/gold leaf materials, wall paint matching, and patina controls).
3. **See transparent, instant INR pricing** calculated down to linear feet (`0.1 ft` precision with `45°` mitre waste accounted for) + provisional `18%` GST (`HSN 4414`).
4. **Generate shareable configuration links, printable A4 specification dossiers, or one-click pre-filled WhatsApp enquiries** straight to the workshop desk.

### Brand Visual Language (For Ad Creatives & Social Alignment)
Marketing creatives, brochures, Instagram Reels covers, and pitch decks should mirror the web atelier's **"Modern Botanical Luxury"** palette (`README.md`):
- **Primary Brand Colour:** Deep Forest (`#24382F`)
- **Metallic / Heritage Accents:** Florentine Bronze (`#B47C55`) & Gilded Amber (`#C8933C`)
- **Gallery Surfaces:** Alabaster (`#F7F5EF`), Warm Gallery Stone (`#E8E4DA`), Pristine Linen (`#FAF8F5`)
- **Text & Action Accents:** Obsidian (`#1C1917`), Muted Slate (`#78716C`), Emerald (`#047857`), WhatsApp Action Emerald (`#25D366`)
- **Typography Pairing:** Editorial serifs (`Cormorant Garamond`, `Playfair Display`) paired with clean sans-serif UI (`DM Sans`, `Plus Jakarta Sans`) and architectural monospace specs (`PT Mono`).

---

## 2. Target Customer Segments & Value Propositions

| Customer Segment | Key Pain Points Solved by Platform | Features to Highlight in Campaigns | Primary Call-to-Action (CTA) |
| :--- | :--- | :--- | :--- |
| **B2C Homeowners, Art Collectors & Gift Buyers** | Afraid custom framing will look wrong on their wall or cost an unexpected amount; don't understand mat sizes or glazing types. | Upload own painting/photo, test on 4 room wall colours, compare `Standard Lucite` vs `Museum Acrylic`, see instant `INR` + GST estimate. | **"Frame Your Artwork in 3D"** → `/studio` |
| **Interior Designers, Architects & Art Galleries** | Need accurate outer frame dimensions for wall elevations, physical finish verification for clients, and GST-compliant quotes. | Exact physical inch/cm dimensions (`2D Blueprint`), **Request Physical Trade Sample Kit** (corner chevrons), shareable deep-link URLs, printable **A4 Spec Dossier** with optional **GSTIN** field. | **"Request Trade Sample Kit"** / **"Open Studio"** |
| **B2B Framing Workshops & Bulk Trade Buyers** | Need dependable, consistent-batch Indian-manufactured hardwood & gilded moulding sticks in bulk cartons with fast dispatch. | Dedicated **B2B Wholesale Mode** toggle in Catalogue showing per-foot carton rates, box footage, **2-day dispatch lead time**, and volume discounts up to **25%**. | **"Explore Wholesale Cartons"** → `/catalog` |

---

## 3. Complete Platform Architecture & Customer Journey

The web application is a single-page client-side platform (`React 18` + `Three.js` + `Tailwind CSS`) with **8 clean user-facing routes** and zero login friction:

| Route Path(s) | Page / Experience | Strategic Purpose in Sales Funnel |
| :--- | :--- | :--- |
| `/` | **Atelier Landing Page** | Editorial brand storytelling, hero showcase (`"Where Craftsmanship Frames Art."`), 4 featured collections, 4-stage manufacturing story, and **Trade Sample Kit** capture modal. |
| `/catalog` (`/catalog/:frameId`) | **Moulding Collections & Wholesale Directory** | Filterable & sortable catalogue of all `25` active profiles (`Workshop Originals`, `Ornate Gold`, `Classic Hardwood`, `Venetian & Antique Gilt`, `Modern Gallery`) + **Custom Framing vs. B2B Wholesale** price toggle. |
| `/product/:frameId` | **Individual Moulding Spec Page** | High-res gallery views, technical dimensions (`Face`, `Depth`, `Rabbet`), finishing provenance, Trade Sample Kit modal, and 3 harmonizing companion profile suggestions. |
| `/configurator` (`/configure`, `/configurator/:id`) | **Interactive 2D Blueprint & Spec Studio** | Split-screen configurator with dimension inputs (`in`/`cm`), preset sizes, custom artwork uploader, mat/glazing/mounting selectors, live pricing breakdown, and **Atelier Quick Quote**. |
| `/studio` (`/3d-studio`, `/studio/:id`) | **3D WebGL Realism Studio** | Full Three.js PBR viewer with orbit rotation, `4` lighting temperatures, `4` architectural camera presets, `3` patina modes, and room wall colour previews. |
| `/review` (`/quote`, `/dossier`) | **Quotation Review & Customer Intake** | Formal Indian domestic validation (Name, `+91` Mobile, Street Address, 6-digit PIN, State/UT dropdown, optional **GSTIN**), delivery preference (`Insured Parcel`, `Art Crate Express`, `Mumbai Workshop Pickup`), and quote locking. |
| `/quotations` (`/saved-quotations`) | **Saved Quotations Ledger** | Personal customer/designer quote history (up to `50` quotes stored locally in-browser) with status tags (`Draft`, `Ready to Send`, `WhatsApp Opened — Awaiting Customer Send`). |
| `/quotation/:id` & `/quotation/:id/print` | **Printable A4 Specification Dossier** | Formal printable PDF/print layout featuring 2D frame diagram, line-item specs, `HSN 4414` GST breakdown, and direct WhatsApp re-enquiry. |

### Built-In Growth Superpower: Shareable Studio Deep-Links
Every custom frame configuration automatically syncs into the browser URL query string (`frameId`, `width`, `height`, `unit`, `matEnabled`, `matId`, `matColorHex`, `matWidth`, `artworkId`, `artworkFit`, `glazingId`, `mountingId`).
- **How Marketing can use this:** You can build pre-configured campaign links (e.g., an Instagram ad for *"16×20 Royal Gold Leaf Wedding Portrait Frame"*) that open the studio pre-loaded with the exact frame, mat, size, and style—reducing friction to nearly zero.
- **How Sales / Interior Designers can use this:** Designers can share one link with their client or print shop and restore the exact configuration immediately.

---

## 4. Product Portfolio & Custom Framing Specification Matrix

### A. Active Moulding Catalogue (`25` Active Profiles)
*(Note: `7` legacy profiles `SAA-FLR-01` through `SAA-SIL-07` have been cleanly retired and filtered from public view.)*

1. **17 Workshop Originals (`SAA-BGD-08` to `SAA-RWW-24`)**
   - Backed by real Sanskruti Arts workshop sample photography and seamless canvas texture reconstruction.
   - Highlighted as **"Workshop Original"** across cards, filters, and product pages.
   - Retail per-linear-foot rates calibrated between **₹280/ft and ₹490/ft** (platform baseline floor: **₹250/ft**).
   - **4 Showcase Aliases Featured on Homepage:**
     - `SA-BG-402` → `SAA-AGB-15` *(Baroque Espresso & Gold / Ornate Antique Gold Baroque)*
     - `SA-AG-118` → `SAA-AGP-16` *(Acanthus Burnished Gold / Ornate Royal Gold Leaf Gallery)*
     - `SA-MG-204` → `SAA-MHG-23` *(Mahogany & Gold Bead / Rich Mahogany with Gold Egg-and-Dart)*
     - `SA-CB-309` → `SAA-BVG-19` *(Crimson & Braided Bronze / Ornate Burgundy Bole & Vintage Gold)*

2. **8 Architectural Heritage Profiles (`GLD-401` to `GLD-422`)**
   - Displayed cleanly in both 2D CAD and 3D WebGL using deterministic, honest procedural architectural surface previews (awaiting authentic studio photography—see Section 7).

### B. Custom Artwork & Sizing Options
- **Units:** Inches (`in`) and Centimeters (`cm`, converted strictly using `2.54`). Default studio size: `16 × 20 in`.
- **Quick Presets:** `8×10"`, `11×14"`, `16×20"`, `20×24"`, `24×36"`.
- **Artwork Handling:** `Contain` (`fit`) or `Cover` (`fill`) scaling + **Custom Client Artwork Upload** persisted in browser storage (`IndexedDB`) across page reloads and printable dossiers.
- **Built-in Demo Gallery (`4` Artworks):** Curated botanical/fine-art sample pieces (`art-1` to `art-4`) so first-time visitors immediately experience high-craft framing before uploading their own photo.

### C. Archival Matboards (`4` Options)
1. **Museum Cotton Rag** (`#f5f3ec`, default `2.5"` border)
2. **Natural Textured Linen** (`#ede4d4`, `3.0"` border)
3. **Archival Charcoal Black** (`#2b2a29`, `2.0"` border)
4. **Full Bleed / No Mat** (`mat-none`, `₹0` mat cost)

### D. Glazing & Mounting Upgrades
| Component Category | Option Name | Pricing Impact (INR) | Marketing Angle |
| :--- | :--- | :--- | :--- |
| **Glazing** | **Tru-Vue Optium Museum Acrylic** | **`+₹1,800`** | Highest-margin upsell: shatterproof, anti-reflective, museum-grade UV protection. |
| **Glazing** | **UltraVue 70 Water White** | **`+₹950`** | Crystal-clear colour fidelity for fine photography and heirloom paintings. |
| **Glazing** | **Standard Conservation Lucite** | **`₹0` (Included)** | Baseline protective framing included in assembly price. |
| **Glazing** | **Stretched Canvas Open Face** | **`-₹500`** | Lower entry price point for oil/acrylic canvases on stretcher bars. |
| **Mounting** | **Heavy-Duty French Cleat** | **`₹0` (Included)** | Architectural flush wall mounting for heavy/large frames. |
| **Mounting** | **Stainless D-Rings & Wire** | **`₹0` (Included)** | Classic gallery hanging hardware. |

### E. Interactive Studio Realism & Proof Controls
- **2D Blueprint View (`FrameCanvas2D.tsx`):** Displays inner opening width/height, finished outer dimensions, face width/rabbet profile specs, diagonal `45°` mitre lines, and an **Exploded CAD Corner View**.
- **3D WebGL View (`ThreeFrameViewer.tsx`):**
  - **4 Lighting Environments:** `3000K` Warm Gallery, `5500K` Natural Daylight, `2400K` Candle/Evening, `Studio` Neutral.
  - **4 Camera Presets:** `Corner` (showcases mitre joinery & relief), `Front`, `Cross-Section` (shows rabbet & depth), `Perspective`.
  - **3 Patina Modes:** `Pristine`, `Antiqued`, `Aged`.
  - **Wall Backdrop Testing:** 4 studio room palettes (`Warm Ivory #F7F5EF`, `Soft Stone #E8E4DA`, `Deep Forest #1B3B2B`, `Prussian Slate #1E293B`) + 5 classic catalogue wall backgrounds (`Gallery White`, `Warm Stone`, `Charcoal Museum`, `Sage Botanical`, `Navy Library`).

---

## 5. Commercial Pricing Formula & B2B Wholesale Model

### A. Retail Custom Framing Pricing Engine (`src/utils/pricing.ts` & `src/types/quotation.ts`)
Every quotation uses one deterministic pricing source of truth:
1. **Linear Footage Needed (with Mitre Waste):**
   $$\text{linearFeet} = \max\left(2,\; \text{round}_{0.1}\left(\frac{2 \times (W_{\text{in}} + H_{\text{in}}) + 8 \times \text{profileWidth}_{\text{in}}}{12}\right)\right)$$
   - `mouldingCost` = $\text{round}(\text{linearFeet} \times \text{footRateINR})$
2. **Matboard Cost:**
   - If `mat-none`: **`₹0`**
   - Otherwise: `260 + (W_in + H_in) * 14`
3. **Glass & Assembly Base Cost:**
   - `380 + (W_in + H_in) * 22` + Glazing Delta (`-₹500` to `+₹1,800`)
4. **Tax & Logistics Transparency:**
   - **Taxable Subtotal** = `mouldingCost + matCost + assemblyCost + glazingDelta`
   - **Provisional GST (`18%`, HSN `4414`)** = `round(subtotal * 0.18)`
   - **Delivery / Crating:** Explicitly excluded from the automated total and marked **"To be confirmed upon dispatch"** based on destination PIN code and volumetric crate size—protecting workshop margins on fragile Pan-India art crating while keeping pricing legally honest.

### B. B2B Wholesale Carton Catalogue (`src/data/wholesale.ts` & `SidebarCatalog.tsx`)
In Wholesale Mode, buyers see carton-level economics across dedicated wholesale SKUs (with `leadTimeDays: 2`, `inStock: true`):

| Wholesale SKU | Stick Spec & Carton Footage | Wholesale Rate / ft | Min. Order Qty (MOQ) | Volume Tier Discounts |
| :--- | :--- | :--- | :--- | :--- |
| **`WM-RAW-05`** | `24 sticks × 9.5 ft` = **`228 ft / box`** | **₹190/ft** *($2.25 ref)* | `2` boxes | `10–29` boxes: **15% off** · `30+` boxes: **25% off** |
| **`WM-VRS-06`** | `10 sticks × 9 ft` = **`90 ft / box`** | **₹490/ft** *($5.75 ref)* | `1` box | `5–19` boxes: **12% off** · `20+` boxes: **22% off** |
| **`WM-RST-07`** | `12 sticks × 9 ft` = **`108 ft / box`** | **₹410/ft** *($4.80 ref)* | `1` box | `5–19` boxes: **12% off** · `20+` boxes: **22% off** |

*(Note: For any active catalogue frame not explicitly linked to one of those 3 wholesale SKU rows, the Catalogue's Wholesale toggle displays an indicative `75%` trade rate across a `108 ft` carton benchmark.)*

---

## 6. Lead Generation & Conversion Funnel Architecture

Because this is a high-ticket custom manufacturing business (where freight, artwork fragility, and exact finishes matter), the site funnels leads into **human-assisted high-conversion WhatsApp closings** backed by full technical specifications:

1. **Funnel 1 — Trade Sample Kit Lead Capture**
   - Available directly on the **Landing Page**, **Catalogue**, and **Product Detail Pages**.
   - Collects Studio/Client Name, Organization/City, Contact, and requested profile codes → triggers a pre-formatted WhatsApp message for physical corner chevron dispatch.
2. **Funnel 2 — Instant Studio Quote (`AtelierQuoteModal.tsx`)**
   - Inside `/configurator` and `/studio`, customers click to get an instant valuation modal with optional Indian address/PIN fields → one click opens `wa.me` with full specs, INR estimate, and a clickable URL restoring their exact frame design.
3. **Funnel 3 — Formal Quotation Review & A4 Dossier (`/review` → `/quotations` → `/quotation/:id`)**
   - Validates domestic buyer fields (`10-digit Indian mobile`, `6-digit PIN code`, selection across `31` Indian States & Union Territories, optional `GSTIN` for B2B tax credit).
   - Saves up to `50` immutable quotation snapshots in browser storage (`SA-Q-...`), enables A4 printable PDF dossier generation, and exports a structured WhatsApp enquiry (`max 2000` URL chars with compact fallback + copy-to-clipboard backup).
   - Honest UX messaging explicitly informs the buyer: *"WhatsApp Opened — Please Press Send"* so expectations stay accurate.

---

## 7. Pre-Launch Checklist & Technical/Asset Gaps to Resolve

Before directing paid ad budgets or large PR campaigns to the live site, Business and Engineering should address **five verified operational gaps**:

| Priority | Verified Finding in Codebase | Business Impact | Recommended Action |
| :--- | :--- | :--- | :--- |
| **P0 — Critical** | **`VITE_WHATSAPP_NUMBER` Default Placeholder:** `src/utils/whatsapp.ts` defaults to `919820000000` (`+91 98200 00000`) if the environment variable is omitted at build time. | All WhatsApp quote enquiries, Sample Kit leads, and Footer concierge chats would route to a placeholder number. | Set `VITE_WHATSAPP_NUMBER=91XXXXXXXXXX` in production hosting / CI build environment immediately and verify every funnel link. |
| **P1 — High** | **Zero Analytics, Pixel, or Backend Lead Persistence:** App is 100% static client-side (`React` + `localStorage`/`IndexedDB`). No backend API, payment gateway, GA4, or Meta Pixel exists. | Marketing cannot measure ROAS, drop-offs between 2D/3D studio and WhatsApp clicks, or capture abandoned quotes before users hit Send on WhatsApp. | Add privacy-safe analytics (GA4 / Meta Pixel events on `Configure`, `Save Quote`, `Request Sample Kit`, and `Open WhatsApp`) and optionally a lightweight webhook/CRM lead form fallback. |
| **P1 — High** | **`8` Heritage Profiles (`GLD-401`–`GLD-422`) Lack Studio Photos:** After Stage 6.2 cleanup, those `8` legacy profiles render clean procedural architectural previews rather than workshop photos. | High-intent B2B buyers inspecting heritage profiles may ask for real texture photos before ordering cartons. | Photograph real workshop samples for `GLD-401`–`GLD-422` and add verified PNGs, or position them visibly as *"Architectural Finish References"* until photographed. |
| **P2 — Medium** | **Static Social Preview Meta (`index.html`):** OpenGraph/Twitter meta tags point to one static image (`/mouldings/ornate-mahogany-and-gold-frame.png`). | Sharing specific `/product/:frameId` or `/studio/:id` links on WhatsApp/LinkedIn/X always shows the same homepage preview card. | Acceptable for single-domain ads, or add edge/build-time OpenGraph injection for top-selling product URLs. |
| **P2 — Medium** | **Wholesale SKU Mapping Disconnect (`wholesale.ts`):** `WM-RAW-05`, `WM-VRS-06`, `WM-RST-07` link to `SAA-RAW-05`, `SAA-VRS-06`, `SAA-RST-07`, which are not among the `25` active `FRAME_SAMPLES` IDs (`SAA-BGD-08`..`SAA-RWW-24` & `GLD-401`..`GLD-422`). | Clicking B2B Wholesale Mode in `/catalog` shows the generic `75%` / `108 ft` carton estimate rather than the exact `228 ft` / `90 ft` / ₹190/ft carton tiers defined in `wholesale.ts`. | Align `frameId` mappings in `wholesale.ts` (or publish those 3 wholesale sticks as active profiles in `frames.ts`) before running B2B carton campaigns. |

---

## 8. Engineering Proof Points Marketing Can Confidently Claim

Following the completed geometry and texture engineering audits (`frameGeometry.ts`, `mouldingReconstruction.ts`, Stage 6.1 & Stage 6.2), Marketing can truthfully highlight:
- **1:1 Physical Inch/CM Parity Between 2D & 3D:** Both the 2D CAD Blueprint and 3D WebGL viewer consume the same unified geometry engine (`1 coordinate unit = 1 physical inch`, exact `2.54` cm conversion, symmetric `45°` mitre corners, and exact rabbet/face widths). What clients preview matches physical dimensions.
- **Seamless Grain & Ornament Rendering:** Real workshop textures are reconstructed with periodic cross-fade continuity and synchronized surface depth/lighting maps (`diffuse`, `normal`, `roughness`) across all `17` Workshop Originals.
- **Zero Misleading Assets or Hidden Fees:** Delivery crating (`Pan-India`) is explicitly quoted per destination PIN rather than guessed, GST (`18%`, `HSN 4414`) is itemized separately, and procedural previews are never disguised as fake photographs.

---

## 9. Recommended 90-Day Online Presence & Client Acquisition Roadmap

### Phase 1: Foundation & Pre-Traffic Setup (Weeks 1–2)
1. Configure live `VITE_WHATSAPP_NUMBER` + WhatsApp Business auto-greeting matching quote template (`#SA-Q-...`).
2. Install Google Analytics 4 + Meta Pixel tracking key funnel events (`View Product`, `Upload Custom Artwork`, `Switch 3D View`, `Request Sample Kit`, `Click WhatsApp Quote`).
3. Create **10–15 pre-built Studio Deep-Links** for top sizes (`16×20"`, `24×36"`) paired with the 4 hero collections (`SA-BG-402`, `SA-AG-118`, `SA-MG-204`, `SA-CB-309`) for social bio links and ad destinations.
4. Set up **Google Business Profile** (Mumbai Workshop & Gujarat Manufacturing locations) featuring real workshop photos + direct link to `/studio` and `/catalog`.

### Phase 2: B2C & Collector Acquisition (Weeks 3–6)
1. **Instagram Reels & Pinterest Content Engine:**
   - Record 15-second split videos: *Client uploads painting → swaps `2D CAD Blueprint` to `3D Studio` → toggles `2400K` vs `5500K` lighting & `Deep Forest` wall → clicks WhatsApp Quote.*
   - Educational Carousel Ads: *"Standard Lucite vs. Museum Acrylic (`+₹1,800`): How UV Glazing Protects Original Paintings."*
2. **Wedding, Family Portrait & Home Decor Targeting (Mumbai, Delhi NCR, Bengaluru, Pune, Ahmedabad, Hyderabad):**
   - Run Meta Click-to-Website ads pointing directly to pre-loaded `/studio` URLs so users test their own family/wedding/art photos immediately.

### Phase 3: B2B Interior Architect & Framing Trade Growth (Weeks 7–12)
1. **Architect & Interior Designer Outreach (LinkedIn + Instagram DMs + Email):**
   - Offer the **"Complimentary/Nominal-Fee Physical Trade Sample Kit"** (6-inch hand-finished mitred corner chevrons) directly linking to the `/catalog` or Landing Page Sample Kit modal.
   - Pitch the **Printable A4 Specification Dossier (`/quotation/:id/print`)** as an instant client-approval PDF designers can drop straight into architectural presentations (`GSTIN` invoice ready).
2. **Regional Framing Shop Carton Acquisition:**
   - Align `wholesale.ts` SKUs with active profiles, then run WhatsApp/IndiaMART/LinkedIn B2B campaigns highlighting **2-day workshop dispatch**, **MOQ starting at 1–2 cartons**, and **up to 25% carton tier discounts** (`HSN 4414` GST billing).
