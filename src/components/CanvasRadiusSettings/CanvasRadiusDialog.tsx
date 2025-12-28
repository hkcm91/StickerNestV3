/**
 * Canvas Border Radius Settings Dialog
 * Allows adjusting the canvas border radius
 */

import React, { useState, useEffect } from 'react';
import { X, CornerDownRight } from 'lucide-react';

interface CanvasRadiusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentRadius: number;
  onSetRadius: (radius: number) => void;
  accentColor?: string;
}

export const CanvasRadiusDialog: React.FC<CanvasRadiusDialogProps> = ({
  isOpen,
  onClose,
  currentRadius,
  onSetRadius,
  accentColor = '#8b5cf6',
}) => {
  const [radius, setRadius] = useState(currentRadius);

  useEffect(() => {
    setRadius(currentRadius);
  }, [currentRadius, isOpen]);

  if (!isOpen) return null;

  const handleApply = () => {
    onSetRadius(radius);
    onClose();
  };

  const presets = [0, 4, 8, 12, 16, 20, 24, 32];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(15, 15, 25, 0.98)',
          backdropFilter: 'blur(40px) saturate(200%)',
          borderRadius: 20,
          border: `1px solid rgba(255, 255, 255, 0.15)`,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          width: '100%',
          maxWidth: 400,
          padding: 24,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: 8,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#94a3b8',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.color = '#e2e8f0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: '#e2e8f0',
              margin: 0,
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <CornerDownRight size={20} style={{ color: accentColor }} />
            Canvas Border Radius
          </h2>
          <p
            style={{
              fontSize: 13,
              color: '#94a3b8',
              margin: 0,
            }}
          >
            Adjust the corner radius of the canvas
          </p>
        </div>

        {/* Radius Input */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 16,
            }}
          >
            <input
              type="range"
              min="0"
              max="100"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.1)',
                outline: 'none',
                cursor: 'pointer',
                WebkitAppearance: 'none',
              }}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                e.currentTarget.style.background = `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${e.currentTarget.value}%, rgba(255, 255, 255, 0.1) ${e.currentTarget.value}%, rgba(255, 255, 255, 0.1) 100%)`;
              }}
            />
            <input
              type="number"
              min="0"
              max="100"
              value={radius}
              onChange={(e) => {
                const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                setRadius(val);
              }}
              style={{
                width: 80,
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: `1px solid rgba(255, 255, 255, 0.1)`,
                borderRadius: 8,
                color: '#e2e8f0',
                fontSize: 14,
                textAlign: 'center',
                outline: 'none',
              }}
            />
            <span style={{ color: '#94a3b8', fontSize: 13, minWidth: 24 }}>px</span>
          </div>

          {/* Presets */}
          <div>
            <label
              style={{
                fontSize: 11,
                color: 'var(--sn-text-secondary)',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'block',
              }}
            >
              Presets
            </label>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {presets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setRadius(preset)}
                  style={{
                    padding: '6px 14px',
                    background: radius === preset ? `${accentColor}33` : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${radius === preset ? accentColor : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: 6,
                    color: radius === preset ? accentColor : '#94a3b8',
                    fontSize: 12,
                    fontWeight: radius === preset ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (radius !== preset) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (radius !== preset) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                >
                  {preset}px
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div
          style={{
            marginBottom: 24,
            padding: 20,
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              width: '100%',
              height: 100,
              background: `linear-gradient(135deg, ${accentColor}33, ${accentColor}66)`,
              borderRadius: radius,
              border: `2px solid ${accentColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Preview: {radius}px radius
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              color: '#94a3b8',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            style={{
              padding: '10px 20px',
              background: accentColor,
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};





