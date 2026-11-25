import React from 'react';
import { getIndianWhatsAppUrl, WHATSAPP_DISPLAY_PHONE } from '../utils/whatsapp';
import { MessageCircle, ShieldCheck, Truck, Award } from 'lucide-react';

export interface FooterProps {
  onNavigateHome?: () => void;
  onNavigateCatalog?: () => void;
  onNavigateConfigurator?: () => void;
  onNavigateStudio?: () => void;
  onNavigateReview?: () => void;
  onNavigateQuotations?: () => void;
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateHome,
  onNavigateCatalog,
  onNavigateConfigurator,
  onNavigateStudio,
  onNavigateReview,
  onNavigateQuotations,
  className = '',
}) => {
  return (
    <footer id="contact" className={`bg-light-primary text-light-on-primary border-t border-accent/30 ${className}`}>
      <div className="max-w-[1360px] mx-auto px-gutter-lg md:px-page-margin py-gutter-xl lg:py-16">
        {/* Main 12-Column Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter-xl pb-gutter-xl border-b border-accent/20">

          {/* Col 1: Logo & Business Information (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-gutter-md">
            <div 
              onClick={onNavigateHome}
              className={`inline-flex items-center gap-gutter-md ${onNavigateHome ? 'cursor-pointer select-none' : ''}`}
            >
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true" className="text-bronze-bright shrink-0">
                <rect x="2" y="2" width="28" height="28" stroke="currentColor" strokeWidth="1.5" />
                <rect x="6" y="6" width="20" height="20" stroke="#F7F3EB" strokeWidth="1" />
                <path d="M2 2L6 6M30 2L26 6M2 30L6 26M30 30L26 26" stroke="currentColor" strokeWidth="1" />
              </svg>
              <div className="flex flex-col">
                <span className="font-headline text-headline-md text-light-on-primary leading-none">
                  Sanskruti Arts
                </span>
                <span className="font-label text-label-sm uppercase text-bronze-bright tracking-widest mt-1">
                  India • Moulding Atelier
                </span>
              </div>
            </div>

            <p className="font-body text-body-md text-light-on-primary-container max-w-prose leading-relaxed">
              Indian manufacturer of decorative picture frame mouldings, authentic 24k gold leaf gilding, and architectural profiles for galleries, framing studios, and interior design spaces.
            </p>

            <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span className="font-label text-label-sm uppercase tracking-widest text-bronze-bright bg-forest-deep px-3 py-1.5 rounded-sm border border-accent/40 font-semibold">
                Serving Trade &amp; Collectors Across India (INR)
              </span>
              <span className="font-mono text-mono-sm text-light-on-primary-container">
                GST Compliant • HSN 4414
              </span>
            </div>
          </div>

          {/* Col 2: Navigation (3 cols) */}
          <div className="md:col-span-3 flex flex-col gap-gutter-md">
            <span className="font-label text-label-sm uppercase tracking-widest text-bronze-bright font-bold">
              Explore Atelier
            </span>
            <ul className="flex flex-col gap-gutter-sm font-body text-body-md text-light-on-primary-container">
              <li>
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="hover:text-light-on-primary transition-colors text-left"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onNavigateCatalog}
                  className="hover:text-light-on-primary transition-colors text-left"
                >
                  Moulding Collections
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onNavigateConfigurator}
                  className="hover:text-light-on-primary transition-colors text-left"
                >
                  Custom Framing Studio
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onNavigateStudio}
                  className="hover:text-light-on-primary transition-colors text-left"
                >
                  3D Raytracing Studio
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onNavigateReview}
                  className="hover:text-light-on-primary transition-colors text-left"
                >
                  Atelier Quotation Dossier
                </button>
              </li>
              {onNavigateQuotations && (
                <li>
                  <button
                    type="button"
                    onClick={onNavigateQuotations}
                    className="hover:text-light-on-primary transition-colors text-left"
                  >
                    Saved Quotations Ledger
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Col 3: Contact & Trade Enquiry (4 cols) */}
          <div className="md:col-span-4 flex flex-col gap-gutter-md">
            <span className="font-label text-label-sm uppercase tracking-widest text-bronze-bright font-bold">
              Trade &amp; Studio Desk
            </span>
            <p className="font-body text-body-md text-light-on-primary-container leading-relaxed">
              Connect directly with our workshop framing master for profile catalogues, physical corner chevrons, and custom commercial framing projects across India.
            </p>

            <div className="flex flex-col gap-1.5 text-xs font-mono text-light-on-primary-container">
              <span>Atelier: Mumbai &amp; Gujarat, India</span>
              <span>Hours: Mon – Sat, 9:30 AM – 7:00 PM IST</span>
              <span>Direct Hotline: {WHATSAPP_DISPLAY_PHONE}</span>
            </div>

            <div className="pt-2">
              <a
                href={getIndianWhatsAppUrl(
                  'Hello Sanskruti Arts, I am contacting you regarding custom picture frame mouldings and trade quotation.'
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-gutter-sm bg-bronze-bright text-light-primary px-6 py-3 rounded-sm font-label text-label-lg uppercase tracking-widest transition-colors duration-state-change hover:bg-cream-linen shadow-xs font-semibold"
                title={`Chat with us on WhatsApp: ${WHATSAPP_DISPLAY_PHONE}`}
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>WhatsApp Enquiry</span>
              </a>
            </div>
          </div>

        </div>

        {/* Value Assurance Badges Strip */}
        <div className="py-6 border-b border-accent/20 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono text-light-on-primary-container">
          <div className="flex items-center gap-2.5">
            <Award className="w-4 h-4 text-bronze-bright shrink-0" />
            <span>Factory Direct Precision Mouldings</span>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-bronze-bright shrink-0" />
            <span>18% GST Invoicing (HSN 4414)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Truck className="w-4 h-4 text-bronze-bright shrink-0" />
            <span>Pan-India Safe Shockproof Delivery</span>
          </div>
        </div>

        {/* Bottom Legal & Copyright Bar */}
        <div className="pt-gutter-lg flex flex-col sm:flex-row items-center justify-between gap-gutter-md text-xs font-body">
          <span className="font-label text-label-sm uppercase tracking-widest text-light-on-primary-container">
            © {new Date().getFullYear()} Sanskruti Arts. All rights reserved.
          </span>
          <span className="font-mono text-mono-sm text-bronze-bright">
            Decorative Picture Frame Mouldings • Mumbai / Gujarat, India
          </span>
        </div>
      </div>
    </footer>
  );
};
