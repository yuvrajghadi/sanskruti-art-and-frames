import React from 'react';

/**
 * Sanskruti Arts Atelier — Stitch Modern Luxury Design Primitives
 * Architecture: Stitch Editorial Luxury Design System
 * Palette:
 * - Forest Deep: #1B3B2B (light-primary-container)
 * - Light Primary: #032517
 * - Accent: #9C7A3C
 * - Bronze Bright: #CCA563
 * - Light Surface Container Low: #F7F3EB
 * - Light Outline Variant: #C1C8C2
 *
 * Sharp 0-2px architectural radii, Cormorant / PT Sans / PT Mono typography.
 */

export interface EyebrowBadgeProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'bronze' | 'forest' | 'stone' | 'amber';
  className?: string;
}

export const EyebrowBadge: React.FC<EyebrowBadgeProps> = ({
  children,
  icon,
  variant = 'bronze',
  className = '',
}) => {
  const variantStyles = {
    bronze: 'bg-light-surface-container-low text-light-secondary border-accent/40',
    forest: 'bg-light-primary/10 text-forest-deep border-forest-deep/30',
    stone: 'bg-light-surface-container-high text-light-on-surface-variant border-light-outline-variant',
    amber: 'bg-light-secondary-container/30 text-light-secondary border-bronze-bright/40',
  };

  const pipStyles = {
    bronze: 'bg-accent',
    forest: 'bg-forest-deep',
    stone: 'bg-light-outline',
    amber: 'bg-bronze-bright',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-sm border text-[11px] font-mono tracking-widest uppercase font-semibold transition-colors select-none ${variantStyles[variant]} ${className}`}
    >
      {icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full ${pipStyles[variant]}`} />
      )}
      <span>{children}</span>
    </div>
  );
};

export interface SectionHeaderProps {
  eyebrow?: string;
  eyebrowVariant?: 'bronze' | 'forest' | 'stone' | 'amber';
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  eyebrowVariant = 'bronze',
  title,
  subtitle,
  align = 'center',
  className = '',
}) => {
  const alignmentClass = {
    left: 'text-left items-start',
    center: 'text-center items-center mx-auto',
    right: 'text-right items-end ml-auto',
  }[align];

  return (
    <div className={`flex flex-col space-y-3.5 max-w-3xl ${alignmentClass} ${className}`}>
      {eyebrow && (
        <EyebrowBadge variant={eyebrowVariant}>
          {eyebrow}
        </EyebrowBadge>
      )}
      <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl text-light-primary tracking-tight font-semibold leading-[1.15] text-balance">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm sm:text-base text-light-on-surface-variant font-body leading-relaxed max-w-2xl text-pretty">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export interface LuxuryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'whatsapp';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
}

export const LuxuryButton: React.FC<LuxuryButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'right',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-label uppercase tracking-widest font-semibold rounded-sm transition-colors duration-state-change ease-state-change select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent';

  const sizeStyles = {
    sm: 'text-[11px] px-4 py-2 gap-1.5',
    md: 'text-xs px-6 py-3 gap-2',
    lg: 'text-xs sm:text-sm px-8 py-4 gap-2.5',
  }[size];

  const variantStyles = {
    primary: 'bg-light-primary hover:bg-forest-deep text-light-on-primary border border-light-primary shadow-xs',
    secondary: 'bg-accent hover:bg-bronze-bright text-light-on-secondary border border-accent shadow-xs',
    outline: 'bg-transparent hover:bg-light-surface-container-high text-light-primary border border-light-primary/70 hover:border-light-primary shadow-xs',
    ghost: 'bg-transparent hover:bg-light-surface-container-low text-light-on-surface',
    whatsapp: 'bg-[#25D366] hover:bg-[#20BA5A] text-white border border-[#25D366] shadow-xs',
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
    </button>
  );
};

export interface SpecPillProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  className?: string;
}

export const SpecPill: React.FC<SpecPillProps> = ({
  label,
  value,
  unit,
  className = '',
}) => {
  return (
    <div className={`bg-light-surface-container-low p-2.5 rounded-sm border border-light-outline-variant/60 font-mono text-center ${className}`}>
      <span className="text-[10px] uppercase font-bold text-light-secondary tracking-wider block mb-0.5">
        {label}
      </span>
      <span className="text-xs sm:text-[13px] font-bold text-light-primary font-spec-numeral">
        {value}
        {unit && <span className="text-[10px] text-light-on-surface-variant ml-0.5">{unit}</span>}
      </span>
    </div>
  );
};
