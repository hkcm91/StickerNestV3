/**
 * StickerNest v2 - SNText
 * Shared text/typography component with theme support
 */

import React from 'react';

export type SNTextVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'body-sm'
  | 'caption'
  | 'label'
  | 'mono';

export type SNTextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'inherit';

export type SNTextWeight = 'normal' | 'medium' | 'semibold' | 'bold';

export interface SNTextProps extends React.HTMLAttributes<HTMLElement> {
  /** Text variant */
  variant?: SNTextVariant;
  /** Text color */
  color?: SNTextColor;
  /** Font weight */
  weight?: SNTextWeight;
  /** Truncate with ellipsis */
  truncate?: boolean;
  /** Maximum lines before truncating */
  maxLines?: number;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** HTML element to render */
  as?: keyof JSX.IntrinsicElements;
}

const variantStyles: Record<SNTextVariant, React.CSSProperties> = {
  h1: {
    fontSize: 'var(--sn-text-2xl)',
    lineHeight: 'var(--sn-leading-tight)',
    fontWeight: 'var(--sn-font-bold)' as unknown as number,
  },
  h2: {
    fontSize: 'var(--sn-text-xl)',
    lineHeight: 'var(--sn-leading-tight)',
    fontWeight: 'var(--sn-font-semibold)' as unknown as number,
  },
  h3: {
    fontSize: 'var(--sn-text-lg)',
    lineHeight: 'var(--sn-leading-snug)',
    fontWeight: 'var(--sn-font-semibold)' as unknown as number,
  },
  h4: {
    fontSize: 'var(--sn-text-base)',
    lineHeight: 'var(--sn-leading-snug)',
    fontWeight: 'var(--sn-font-medium)' as unknown as number,
  },
  body: {
    fontSize: 'var(--sn-text-base)',
    lineHeight: 'var(--sn-leading-normal)',
    fontWeight: 'var(--sn-font-normal)' as unknown as number,
  },
  'body-sm': {
    fontSize: 'var(--sn-text-sm)',
    lineHeight: 'var(--sn-leading-normal)',
    fontWeight: 'var(--sn-font-normal)' as unknown as number,
  },
  caption: {
    fontSize: 'var(--sn-text-xs)',
    lineHeight: 'var(--sn-leading-normal)',
    fontWeight: 'var(--sn-font-normal)' as unknown as number,
  },
  label: {
    fontSize: 'var(--sn-text-sm)',
    lineHeight: 'var(--sn-leading-normal)',
    fontWeight: 'var(--sn-font-medium)' as unknown as number,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  mono: {
    fontSize: 'var(--sn-text-sm)',
    lineHeight: 'var(--sn-leading-normal)',
    fontFamily: 'var(--sn-font-mono)',
    fontWeight: 'var(--sn-font-normal)' as unknown as number,
  },
};

const colorMap: Record<SNTextColor, string> = {
  primary: 'var(--sn-text-primary)',
  secondary: 'var(--sn-text-secondary)',
  tertiary: 'var(--sn-text-tertiary)',
  accent: 'var(--sn-accent-primary)',
  success: 'var(--sn-success)',
  warning: 'var(--sn-warning)',
  error: 'var(--sn-error)',
  inherit: 'inherit',
};

const weightMap: Record<SNTextWeight, string> = {
  normal: 'var(--sn-font-normal)',
  medium: 'var(--sn-font-medium)',
  semibold: 'var(--sn-font-semibold)',
  bold: 'var(--sn-font-bold)',
};

const defaultElements: Record<SNTextVariant, keyof JSX.IntrinsicElements> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  body: 'p',
  'body-sm': 'p',
  caption: 'span',
  label: 'span',
  mono: 'code',
};

export const SNText: React.FC<SNTextProps> = ({
  variant = 'body',
  color = 'primary',
  weight,
  truncate = false,
  maxLines,
  align,
  as,
  children,
  style,
  ...props
}) => {
  const Element = as || defaultElements[variant];

  const textStyle: React.CSSProperties = {
    margin: 0,
    ...variantStyles[variant],
    color: colorMap[color] || 'var(--sn-text-primary)',
    ...(weight && { fontWeight: weightMap[weight] as unknown as number }),
    ...(align && { textAlign: align }),
    ...(truncate && {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
    ...(maxLines && {
      display: '-webkit-box',
      WebkitLineClamp: maxLines,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    }),
    // Filter undefined values from style prop to prevent React error #306
    ...(style ? Object.fromEntries(Object.entries(style).filter(([_, v]) => v !== undefined)) : {}),
  };

  return React.createElement(
    Element,
    { style: textStyle, ...props },
    children
  );
};

export default SNText;
