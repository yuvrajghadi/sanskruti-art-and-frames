import { useEffect } from 'react';
import { FrameSample } from '../types';
import { RouteInfo } from './routes';
import { getMouldingFootRateINR } from './pricing';

export const CANONICAL_DOMAIN = 'https://sanskrutiarts.com';

export interface DocumentMetaPayload {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
  ogType?: string;
  ogImage?: string;
}

function ensureMetaTag(attrName: 'name' | 'property', attrValue: string): HTMLMetaElement {
  let el = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  return el;
}

function ensureCanonicalLink(): HTMLLinkElement {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  return el;
}

export function upsertJsonLdScript(id: string, schema: Record<string, unknown> | null): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(id);
  if (!schema) {
    existing?.remove();
    return;
  }

  let script = existing as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schema);
}

export function computeRouteMeta(
  routeInfo: RouteInfo,
  selectedFrame: FrameSample | null,
  productFrame?: FrameSample | null
): DocumentMetaPayload {
  const path = routeInfo.path || '/';
  const frameForMeta = routeInfo.route === 'product' ? productFrame : selectedFrame;
  const mouldingName = frameForMeta?.name || 'Atelier Moulding';

  switch (routeInfo.route) {
    case 'catalog': {
      const isWholesale = routeInfo.presetIntent === 'wholesale-mouldings';
      return {
        title: isWholesale
          ? 'B2B Wholesale Picture Frame Moulding Cartons | Sanskruti Arts'
          : 'Picture Frame Moulding Catalogue — Retail & B2B Wholesale Cartons | Sanskruti Arts',
        description: isWholesale
          ? 'Factory-direct B2B wholesale moulding boxes with 2-day workshop dispatch, 9–9.5 ft sticks, carton MOQs, and volume discounts up to 25% under HSN 4414.'
          : 'Browse 25 architectural picture frame mouldings across Ornate Gold, Antique Gilt, Hardwood, and Modern Gallery finishes with retail INR & B2B carton tariffs.',
        canonicalUrl: isWholesale
          ? `${CANONICAL_DOMAIN}/wholesale-mouldings`
          : `${CANONICAL_DOMAIN}/catalog`,
        robots: 'index, follow',
      };
    }

    case 'product': {
      const sku = productFrame?.id || routeInfo.frameId || 'SPEC';
      const rate = productFrame ? getMouldingFootRateINR(productFrame) : null;
      return {
        title: `${productFrame?.name || `Profile #${sku}`} (#${sku}) — Custom Frame & Moulding Spec | Sanskruti Arts`,
        description: productFrame
          ? `${productFrame.name} (#${productFrame.id}): ${productFrame.profileWidth.toFixed(2)}" face, ${productFrame.depth.toFixed(2)}" depth in ${productFrame.material}. ${rate ? `₹${rate}/linear ft` : ''} with custom 2D/3D studio preview & GST billing.`
          : `Inspect picture frame moulding specifications, cross-section geometry, and custom framing pricing at Sanskruti Arts Atelier.`,
        canonicalUrl: `${CANONICAL_DOMAIN}${path}`,
        robots: 'index, follow',
        ogImage: productFrame?.thumbnailUrl?.startsWith('/')
          ? `${CANONICAL_DOMAIN}${productFrame.thumbnailUrl}`
          : undefined,
      };
    }

    case 'configure':
    case 'studio': {
      if (routeInfo.presetIntent === 'custom-photo-framing') {
        return {
          title: `Custom Photo Framing Studio — ${mouldingName} | Sanskruti Arts`,
          description:
            'Upload your photography, preview 16×20 in Museum Cotton Rag matting in live 2D & 3D WebGL, and generate instant INR + 18% GST framing quotes.',
          canonicalUrl: `${CANONICAL_DOMAIN}/custom-photo-framing`,
          robots: 'index, follow',
        };
      }
      if (routeInfo.presetIntent === 'canvas-framing') {
        return {
          title: `Stretched Canvas Framing Studio — ${mouldingName} | Sanskruti Arts`,
          description:
            'Configure open-face stretched canvas frames in real-time 2D & 3D proportions with solid hardwood mouldings and instant INR workshop pricing.',
          canonicalUrl: `${CANONICAL_DOMAIN}/canvas-framing`,
          robots: 'index, follow',
        };
      }
      return {
        title: `2D/3D Custom Frame Studio — ${mouldingName} | Sanskruti Arts`,
        description:
          'Interactive 2D architectural elevation and 3D WebGL custom picture framing studio. Customize artwork dimensions, archival mats, UV acrylic glazing, and hardware.',
        canonicalUrl: `${CANONICAL_DOMAIN}${routeInfo.route === 'studio' ? '/studio' : '/configurator'}`,
        robots: 'index, follow',
      };
    }

    case 'review':
    case 'quotations':
    case 'quotation':
      return {
        title:
          routeInfo.route === 'quotations'
            ? 'Saved Quotations & Trade Enquiries | Sanskruti Arts Atelier'
            : 'Custom Framing Quotation Dossier | Sanskruti Arts Atelier',
        description:
          'Private Sanskruti Arts Atelier quotation dossier and local enquiry ledger.',
        canonicalUrl: `${CANONICAL_DOMAIN}${path}`,
        robots: 'noindex, nofollow',
      };

    case 'home':
    default:
      return {
        title: 'Sanskruti Arts Atelier | Custom Picture Framing & Moulding Manufacturer India',
        description:
          'Luxury Indian picture frame moulding manufacturer in Mumbai & Gujarat. Explore 25 hardwood & gilded profiles, configure frames live in 2D/3D, and request B2B sample kits.',
        canonicalUrl: `${CANONICAL_DOMAIN}/`,
        robots: 'index, follow',
      };
  }
}

export function buildLocalBusinessSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'Manufacturer'],
    name: 'Sanskruti Arts Atelier',
    url: CANONICAL_DOMAIN,
    image: `${CANONICAL_DOMAIN}/mouldings/ornate-mahogany-and-gold-frame.png`,
    description:
      'Indian manufacturer of luxury decorative picture frame mouldings, custom museum framing, and B2B wholesale moulding cartons under HSN 4414.',
    priceRange: '₹250 - ₹570 per linear ft (full catalogue) / B2B Wholesale Cartons from ₹190/ft',
    currenciesAccepted: 'INR',
    openingHours: 'Mo-Sa 09:30-19:00',
    areaServed: 'India',
    address: [
      {
        '@type': 'PostalAddress',
        addressLocality: 'Mumbai',
        addressRegion: 'Maharashtra',
        addressCountry: 'IN',
      },
      {
        '@type': 'PostalAddress',
        addressRegion: 'Gujarat',
        addressCountry: 'IN',
      },
    ],
    makesOffer: {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Product',
        name: 'Custom Picture Frame Mouldings & Wholesale Cartons (HSN 4414)',
        category: 'Picture Frames & Framing Mouldings',
      },
      priceCurrency: 'INR',
    },
  };
}

export function buildProductSchema(frame: FrameSample): Record<string, unknown> {
  const footRate = getMouldingFootRateINR(frame);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: frame.name,
    sku: frame.id,
    mpn: frame.id,
    description: frame.description,
    material: frame.material,
    category: frame.category,
    image: frame.thumbnailUrl?.startsWith('/')
      ? `${CANONICAL_DOMAIN}${frame.thumbnailUrl}`
      : frame.thumbnailUrl,
    brand: {
      '@type': 'Brand',
      name: 'Sanskruti Arts',
    },
    offers: {
      '@type': 'Offer',
      url: `${CANONICAL_DOMAIN}/product/${frame.id}`,
      priceCurrency: 'INR',
      price: footRate,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: footRate,
        priceCurrency: 'INR',
        unitText: 'linear foot',
      },
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
}

export const LANDING_FAQS = [
  {
    question: 'How does Sanskruti Arts ship framed artworks safely across India?',
    answer:
      'Every framed artwork is wrapped with shock-absorbing corner protection, protective sleeve wrapping, and custom corrugated or timber crating. Pan-India insured transit freight is confirmed transparently by our Mumbai and Gujarat workshop based on your PIN code and crate volume before dispatch.',
  },
  {
    question: 'Should I choose Tru-Vue Optium Museum Acrylic or Standard Lucite glass glazing?',
    answer:
      'Tru-Vue Optium Museum Acrylic (+₹1,800) blocks 99% of UV rays, eliminates surface glare with anti-reflective optical coating, and is shatterproof—ideal for heirlooms, original paintings, and courier transit. UltraVue 70 offers 70% UV water-white clarity (+₹950), while Standard Conservation Lucite (₹0 included) suits everyday prints and Open Canvas (-₹500) leaves stretched oil/acrylic canvases unglazed.',
  },
  {
    question: 'What are the MOQs and dispatch times for B2B wholesale moulding cartons?',
    answer:
      'B2B framing studios and interior contractors can order standard cartons starting from 1–2 boxes per SKU (9.0 ft or 9.5 ft sticks totaling 90–228 linear ft per carton). In-stock wholesale boxes dispatch within 2 working days with 12% to 25% volume tier discounts and HSN 4414 GST billing.',
  },
];

export function buildFaqSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: LANDING_FAQS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/**
 * Synchronizes document <title>, meta description, canonical link, OpenGraph, robots directives,
 * and route JSON-LD structured data cleanly on every navigation state change.
 */
export function useDocumentMeta(
  routeInfo: RouteInfo,
  selectedFrame: FrameSample | null,
  productFrame?: FrameSample | null
): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const meta = computeRouteMeta(routeInfo, selectedFrame, productFrame);

    document.title = meta.title;
    ensureMetaTag('name', 'description').content = meta.description;
    ensureMetaTag('name', 'robots').content = meta.robots;
    ensureMetaTag('property', 'og:title').content = meta.title;
    ensureMetaTag('property', 'og:description').content = meta.description;
    ensureMetaTag('property', 'og:url').content = meta.canonicalUrl;
    if (meta.ogImage) {
      ensureMetaTag('property', 'og:image').content = meta.ogImage;
    }
    ensureCanonicalLink().href = meta.canonicalUrl;

    if (routeInfo.route === 'home') {
      upsertJsonLdScript('schema-local-business', buildLocalBusinessSchema());
      upsertJsonLdScript('schema-faq-page', buildFaqSchema());
      upsertJsonLdScript('schema-product', null);
    } else if (routeInfo.route === 'product' && productFrame) {
      upsertJsonLdScript('schema-local-business', null);
      upsertJsonLdScript('schema-faq-page', null);
      upsertJsonLdScript('schema-product', buildProductSchema(productFrame));
    } else {
      upsertJsonLdScript('schema-local-business', null);
      upsertJsonLdScript('schema-faq-page', null);
      upsertJsonLdScript('schema-product', null);
    }
  }, [
    routeInfo.route,
    routeInfo.path,
    routeInfo.frameId,
    routeInfo.presetIntent,
    selectedFrame?.id,
    selectedFrame?.name,
    productFrame?.id,
    productFrame?.name,
  ]);
}
