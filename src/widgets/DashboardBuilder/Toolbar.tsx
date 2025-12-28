import React from 'react';
import { Plus } from 'lucide-react';

interface ToolbarProps {
  children?: React.ReactNode;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
  theme?: 'light' | 'dark';
}

interface ToolbarSlotProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  isEmpty?: boolean;
  label?: string;
  theme?: 'light' | 'dark';
  variant?: 'default' | 'action'; // 'action' for save/toggle buttons
}

export function Toolbar({
  children,
  className = '',
  orientation = 'vertical',
  theme = 'dark'
}: ToolbarProps) {
  const baseStyles = 'flex p-3 gap-3 rounded-3xl transition-all duration-500 ease-out relative overflow-hidden';
  const orientationStyles = orientation === 'vertical' ? 'flex-col w-[88px] h-auto' : 'flex-row h-[88px] w-auto';
  // Premium Glassmorphism Styles
  const themeStyles = theme === 'dark' ? 'bg-[#1a1b26]/60 backdrop-blur-2xl border border-white/10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] ring-1 ring-white/5' : 'bg-white/60 backdrop-blur-2xl border border-black/5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] ring-1 ring-white/40';
  // Inner highlight for 3D feel
  const innerHighlight = theme === 'dark' ? 'after:absolute after:inset-0 after:rounded-3xl after:ring-1 after:ring-inset after:ring-white/10 after:pointer-events-none' : 'after:absolute after:inset-0 after:rounded-3xl after:ring-1 after:ring-inset after:ring-white/50 after:pointer-events-none';
  return <div className={`
        ${baseStyles} 
        ${orientationStyles} 
        ${themeStyles} 
        ${innerHighlight}
        ${className}
      `} role="toolbar" aria-orientation={orientation}>
      {/* Subtle gradient overlay for surface texture */}
      <div className={`absolute inset-0 pointer-events-none opacity-20 ${theme === 'dark' ? 'bg-gradient-to-b from-white/10 to-transparent' : 'bg-gradient-to-b from-white/80 to-transparent'}`} />

      <div className="relative z-10 flex flex-col gap-3 w-full h-full">
        {children}
      </div>
    </div>;
}

export function ToolbarSlot({
  isActive,
  isEmpty,
  className = '',
  children,
  label,
  theme = 'dark',
  variant = 'default',
  ...props
}: ToolbarSlotProps) {
  const isDark = theme === 'dark';
  // Base slot styles
  const slotBase = 'group relative flex items-center justify-center w-full aspect-square rounded-2xl transition-all duration-300 ease-out outline-none';
  // Active state styles
  const activeStyles = isDark ? 'bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border-white/20 shadow-[0_0_20px_rgba(168,85,247,0.25)] text-white' : 'bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-black/5 shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-indigo-600';
  // Inactive state styles
  const inactiveStyles = isDark ? 'bg-white/5 hover:bg-white/10 border-transparent hover:border-white/10 text-white/40 hover:text-white/90 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'bg-black/5 hover:bg-black/10 border-transparent hover:border-black/5 text-black/40 hover:text-black/80 hover:shadow-[0_2px_8px_rgba(0,0,0,0.05)]';
  // Action variant (smaller, different styling for top buttons)
  const actionStyles = variant === 'action' ? `!aspect-auto h-10 mb-1 ${isDark ? 'bg-transparent hover:bg-white/10' : 'bg-transparent hover:bg-black/5'} border-none shadow-none` : '';
  return <button className={`
        ${slotBase}
        ${isActive ? activeStyles : inactiveStyles}
        ${isActive ? 'scale-100' : 'hover:scale-105 active:scale-95'}
        border
        ${actionStyles}
        ${className}
      `} title={label} aria-label={label || 'Toolbar slot'} {...props}>
      {/* Glow effect on hover (Dark mode only) */}
      {isDark && !isActive && variant !== 'action' && <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-purple-500/10 via-transparent to-cyan-500/10 pointer-events-none" />}

      {/* Content */}
      <div className="relative z-10">
        {children || isEmpty && <Plus size={20} className={isDark ? 'opacity-30' : 'opacity-30'} />}
      </div>

      {/* Active Indicator Dot */}
      {isActive && variant !== 'action' && <div className={`
          absolute -right-1.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full 
          ${isDark ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]'}
        `} />}
    </button>;
}







