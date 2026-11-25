import React, { useState } from 'react';
import { FrameSample, DimensionUnit, MatOption, ArtworkOption, CurrencyCode } from '../types';
import { calculateFramePrice, formatINR, getMouldingFootRateINR, GST_RATE } from '../utils/pricing';
import { formatWhatsAppQuoteUrl, WHATSAPP_DISPLAY_PHONE } from '../utils/whatsapp';
import { GlazingOption, MountingOption, GLAZING_OPTIONS, MOUNTING_OPTIONS } from './CustomFramingStudio';
import { 
  X, 
  Check, 
  Sparkles, 
  Lock,
  ArrowRight, 
  MessageCircle,
  MapPin
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AtelierQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFrame: FrameSample | null;
  width: number;
  height: number;
  unit: DimensionUnit;
  selectedMat: MatOption;
  selectedArtwork: ArtworkOption;
  customArtUrl?: string | null;
  currency?: CurrencyCode;
  selectedGlazing?: GlazingOption;
  selectedMounting?: MountingOption;
}

export const AtelierQuoteModal: React.FC<AtelierQuoteModalProps> = ({
  isOpen,
  onClose,
  selectedFrame,
  width,
  height,
  unit,
  selectedMat,
  selectedArtwork,
  customArtUrl,
  selectedGlazing,
  selectedMounting,
}) => {
  const [shippingTier, setShippingTier] = useState<'standard' | 'courier'>('standard');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Indian domestic delivery fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPin, setCustomerPin] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  if (!isOpen || !selectedFrame) return null;

  const activeGlazing = selectedGlazing || GLAZING_OPTIONS[0];
  const activeMounting = selectedMounting || MOUNTING_OPTIONS[0];

  // Valuation calculation in INR with 18% GST (HSN 4414)
  const footRate = getMouldingFootRateINR(selectedFrame);
  const basePrice = calculateFramePrice(selectedFrame, width, height, unit, selectedMat, 'INR');
  const glazingCost = activeGlazing.priceDelta;
  const rawSubtotal = Math.max(0, (basePrice.subtotal || basePrice.totalPrice) + glazingCost);
  const gstAmount = Math.round(rawSubtotal * GST_RATE);
  // Delivery is unconfirmed and excluded from the quotation total until approved
  const grandTotal = rawSubtotal + gstAmount;

  const activeArt = customArtUrl || selectedArtwork.imageUrl;

  const handleAuthorize = () => {
    setIsAuthorizing(true);
    setTimeout(() => {
      setIsAuthorizing(false);
      setIsAuthorized(true);
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#B47C55', '#24382F', '#D9E7D0', '#ffffff']
        });
      } catch (e) {
        // Fallback
      }
    }, 1500);
  };

  const whatsappUrl = formatWhatsAppQuoteUrl({
    frameId: selectedFrame.id,
    frameName: selectedFrame.name,
    profileWidth: selectedFrame.profileWidth,
    width,
    height,
    unit,
    matName: selectedMat.name,
    glazingName: activeGlazing.name,
    mountingName: activeMounting.name,
    basePrice: rawSubtotal,
    gstAmount,
    estimatedPrice: grandTotal,
    currency: 'INR',
    customerName: customerName.trim() || undefined,
    customerCity: customerCity.trim() || undefined,
    customerState: customerState.trim() || undefined,
    customerPin: customerPin.trim() || undefined,
    shareUrl: typeof window !== 'undefined' ? window.location.href : undefined,
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#E8E4DA] overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-6 bg-[#F7F5EF] border-b border-[#E8E4DA] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#B47C55] flex items-center justify-center bg-[#ECEFEA] text-[#24382F] font-serif font-bold">
              SA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg sm:text-xl font-bold text-[#24382F] tracking-tight">
                  Atelier Quote &amp; Order Review
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold bg-[#B47C55]/15 text-[#B47C55] rounded-full border border-[#B47C55]/30">
                  Dossier #SAA-8842
                </span>
              </div>
              <p className="text-xs text-[#5A615C]">
                Sanskruti Arts · Indian Manufacturer of Decorative Picture Frame Mouldings
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#5A615C] hover:text-[#24382F] bg-white rounded-full border border-[#E8E4DA] shadow-xs transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Curation Overview Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#F7F5EF] border border-[#E8E4DA] flex flex-col sm:flex-row gap-5 items-center">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden border border-[#E8E4DA] relative bg-[#ECEFEA] flex-shrink-0 shadow-xs">
              <img
                src={activeArt}
                alt={selectedArtwork.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-1.5 left-1.5 bg-black/70 text-white font-mono text-[9px] px-1.5 py-0.5 rounded">
                {width}×{height}"
              </div>
            </div>

            <div className="flex-1 w-full space-y-1.5 text-center sm:text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B47C55] block">
                Custom Framing Specification · Made in India
              </span>
              <h4 className="font-serif text-xl sm:text-2xl font-bold text-[#24382F]">
                {selectedFrame.name}
              </h4>
              <p className="text-xs text-[#5A615C] leading-relaxed">
                Milled from solid {selectedFrame.material} with {selectedFrame.finish}. Assembled with precision corner joinery.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs font-mono text-[#24382F]">
                <span className="px-2.5 py-1 bg-white rounded-md border border-[#E8E4DA]">
                  Cavity: {width}×{height} {unit}
                </span>
                <span className="px-2.5 py-1 bg-white rounded-md border border-[#E8E4DA]">
                  Mat: {selectedMat.name.split('(')[0]} ({selectedMat.borderWidth}")
                </span>
                <span className="px-2.5 py-1 bg-white rounded-md border border-[#E8E4DA]">
                  Glazing: {activeGlazing.name}
                </span>
              </div>
            </div>
          </div>

          {/* Workshop Sign-off Banner */}
          <div className="p-4 rounded-2xl bg-[#ECEFEA] border border-[#E8E4DA] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#24382F] text-white flex items-center justify-center font-serif font-bold text-sm flex-shrink-0">
              SA
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-serif text-sm font-bold text-[#24382F]">
                  Sanskruti Arts Direct Workshop
                </span>
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 font-semibold">
                  Factory Guarantee
                </span>
              </div>
              <p className="text-xs text-[#5A615C] mt-0.5">
                Direct manufacturing · Hand-carved profile detailing · 100-year conservation guarantee · WhatsApp: {WHATSAPP_DISPLAY_PHONE}
              </p>
            </div>
          </div>

          {/* Domestic Delivery Details (Indian Market) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#B47C55]" />
              <h5 className="font-serif text-sm font-bold text-[#24382F] uppercase tracking-wider">
                Domestic Delivery Address (India)
              </h5>
            </div>
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DA] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#5A615C] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Sharma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white border border-[#E8E4DA] rounded-lg px-3 py-2 text-xs text-[#24382F] focus:outline-none focus:ring-1 focus:ring-[#B47C55]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#5A615C] mb-1">
                  Mobile Number (+91)
                </label>
                <input
                  type="tel"
                  placeholder="98200 12345"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-white border border-[#E8E4DA] rounded-lg px-3 py-2 text-xs text-[#24382F] focus:outline-none focus:ring-1 focus:ring-[#B47C55]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#5A615C] mb-1">
                  City &amp; State
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="City (e.g. Mumbai)"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    className="w-full bg-white border border-[#E8E4DA] rounded-lg px-3 py-2 text-xs text-[#24382F] focus:outline-none focus:ring-1 focus:ring-[#B47C55]"
                  />
                  <input
                    type="text"
                    placeholder="State (e.g. Maharashtra)"
                    value={customerState}
                    onChange={(e) => setCustomerState(e.target.value)}
                    className="w-full bg-white border border-[#E8E4DA] rounded-lg px-3 py-2 text-xs text-[#24382F] focus:outline-none focus:ring-1 focus:ring-[#B47C55]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#5A615C] mb-1">
                  6-Digit PIN Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 400001"
                  value={customerPin}
                  onChange={(e) => setCustomerPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-white border border-[#E8E4DA] rounded-lg px-3 py-2 text-xs text-[#24382F] focus:outline-none focus:ring-1 focus:ring-[#B47C55]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-[#5A615C] mb-1">
                  Street / Studio / Gallery Address
                </label>
                <input
                  type="text"
                  placeholder="Building, street name, locality"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full bg-white border border-[#E8E4DA] rounded-lg px-3 py-2 text-xs text-[#24382F] focus:outline-none focus:ring-1 focus:ring-[#B47C55]"
                />
              </div>
            </div>
          </div>

          {/* Itemized Valuation Breakdown with GST */}
          <div className="space-y-3">
            <h5 className="font-serif text-sm font-bold text-[#24382F] uppercase tracking-wider">
              Itemized Material &amp; GST Allocation
            </h5>
            <div className="rounded-2xl border border-[#E8E4DA] overflow-hidden text-xs">
              <div className="divide-y divide-[#E8E4DA]">
                <div className="p-3.5 flex justify-between items-center bg-white">
                  <div>
                    <span className="font-bold text-[#24382F] block">Handcrafted Moulding Profile</span>
                    <span className="text-[11px] text-[#5A615C]">{selectedFrame.name} · {basePrice.linearFeet.toFixed(2)} linear ft @ ₹{footRate}/ft</span>
                  </div>
                  <span className="font-mono font-bold text-[#24382F]">{formatINR(basePrice.moldingCost)}</span>
                </div>

                <div className="p-3.5 flex justify-between items-center bg-white">
                  <div>
                    <span className="font-bold text-[#24382F] block">Conservation Cotton Matting</span>
                    <span className="text-[11px] text-[#5A615C]">Acid-free core, precision 45° beveled cut</span>
                  </div>
                  <span className="font-mono text-emerald-700 font-bold">Included</span>
                </div>

                <div className="p-3.5 flex justify-between items-center bg-white">
                  <div>
                    <span className="font-bold text-[#24382F] block">{activeGlazing.name}</span>
                    <span className="text-[11px] text-[#5A615C]">{activeGlazing.specs}</span>
                  </div>
                  <span className="font-mono font-bold text-[#24382F]">
                    {activeGlazing.priceDelta > 0 
                      ? `+${formatINR(activeGlazing.priceDelta)}` 
                      : activeGlazing.priceDelta < 0 
                      ? `-${formatINR(Math.abs(activeGlazing.priceDelta))}` 
                      : 'Included'}
                  </span>
                </div>

                <div className="p-3.5 flex justify-between items-center bg-white">
                  <div>
                    <span className="font-bold text-[#24382F] block">{activeMounting.name}</span>
                    <span className="text-[11px] text-[#5A615C]">{activeMounting.specs}</span>
                  </div>
                  <span className="font-mono text-emerald-700 font-bold">Included</span>
                </div>

                <div className="p-3.5 flex justify-between items-center bg-white">
                  <div>
                    <span className="font-bold text-[#24382F] block">Protective Corner Crate Packaging</span>
                    <span className="text-[11px] text-[#5A615C]">Shock-resistant foam corners and transit wrap</span>
                  </div>
                  <span className="font-mono text-emerald-700 font-bold">Included</span>
                </div>

                <div className="p-3.5 flex justify-between items-center bg-[#FAF8F5]">
                  <div>
                    <span className="font-bold text-[#24382F] block">Taxable Base Subtotal</span>
                    <span className="text-[11px] text-[#5A615C]">Frame profile, matboard &amp; glazing</span>
                  </div>
                  <span className="font-mono font-bold text-[#24382F]">{formatINR(rawSubtotal)}</span>
                </div>

                <div className="p-3.5 flex justify-between items-center bg-[#FAF8F5]">
                  <div>
                    <span className="font-bold text-[#24382F] block">Goods &amp; Services Tax (GST @ 18%)</span>
                    <span className="text-[11px] text-[#5A615C]">HSN Code: 4414 (Wooden Frame Mouldings)</span>
                  </div>
                  <span className="font-mono font-bold text-[#24382F]">{formatINR(gstAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Tier Radio Selection */}
          <div className="space-y-3">
            <h5 className="font-serif text-sm font-bold text-[#24382F] uppercase tracking-wider">
              Transit &amp; Delivery Logistics across India
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label 
                onClick={() => setShippingTier('standard')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  shippingTier === 'standard'
                    ? 'border-[#B47C55] bg-white ring-2 ring-[#B47C55]/30 shadow-xs'
                    : 'border-[#E8E4DA] bg-[#F7F5EF] hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="shipping_tier"
                  checked={shippingTier === 'standard'}
                  onChange={() => setShippingTier('standard')}
                  className="accent-[#B47C55] w-4 h-4 mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#24382F]">Safe Pan-India Transit</span>
                    <span className="font-mono text-xs font-bold text-[#5A615C]">
                      TBD on Dispatch
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5A615C] mt-1">
                    Protected parcel delivery across all major Indian cities; quoted upon destination PIN confirmation.
                  </p>
                </div>
              </label>

              <label 
                onClick={() => setShippingTier('courier')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  shippingTier === 'courier'
                    ? 'border-[#B47C55] bg-white ring-2 ring-[#B47C55]/30 shadow-xs'
                    : 'border-[#E8E4DA] bg-[#F7F5EF] hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="shipping_tier"
                  checked={shippingTier === 'courier'}
                  onChange={() => setShippingTier('courier')}
                  className="accent-[#B47C55] w-4 h-4 mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#24382F]">Dedicated Fine Art Express</span>
                    <span className="font-mono text-xs font-bold text-[#5A615C]">
                      Quoted by Workshop
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5A615C] mt-1">
                    Direct courier with bespoke wooden crate packaging; quoted upon crate volume confirmation.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Bottom Authorization Tray */}
        <div className="p-4 sm:p-6 bg-[#F7F5EF] border-t border-[#E8E4DA] flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5A615C]">
                Final Estimated Amount (Excl. Transit):
              </span>
              <span className="font-serif text-2xl sm:text-3xl font-bold text-[#24382F]">
                {formatINR(grandTotal)}
              </span>
            </div>
            <p className="text-[11px] text-[#5A615C]">
              Includes {selectedFrame.name} profile, provisional 18% GST (HSN 4414) &amp; glazing. Transit quoted upon destination confirmation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enquire via WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handleAuthorize}
              disabled={isAuthorizing || isAuthorized}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs ${
                isAuthorized
                  ? 'bg-emerald-700 text-white'
                  : 'bg-[#24382F] hover:bg-[#B47C55] text-white'
              }`}
            >
              {isAuthorizing ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-[#FFDCC6]" />
                  <span>Securing Workshop Allocation...</span>
                </>
              ) : isAuthorized ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Quotation Logged #SAA-8842</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Confirm Estimate ({formatINR(grandTotal)})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
