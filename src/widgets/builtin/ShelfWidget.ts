/**
 * StickerNest v2 - Shelf Widget
 *
 * A beautiful, customizable modular shelf with realistic 3D appearance.
 * Supports configurable rows, dividers, wood materials, shadows, and highlights.
 * Features snap slots for organizing items like books, plants, and decorations.
 * Procedurally expands horizontally and vertically.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const ShelfWidgetManifest: WidgetManifest = {
  id: 'stickernest.shelf',
  name: 'Shelf',
  version: '1.0.0',
  kind: 'container',
  entry: 'index.html',
  description: 'A beautiful, customizable modular shelf with realistic 3D wood appearance. Features snap slots for organizing items. Supports rows, dividers, materials, and depth effects.',
  author: 'StickerNest',
  tags: ['shelf', 'display', 'furniture', 'organizer', 'wood', '3d', 'container', 'decorative', 'bookshelf'],
  inputs: {
    rows: {
      type: 'number',
      description: 'Number of shelf rows',
      default: 3,
    },
    dividers: {
      type: 'number',
      description: 'Number of vertical dividers per row',
      default: 2,
    },
    slotsPerCompartment: {
      type: 'number',
      description: 'Number of snap slots per compartment',
      default: 3,
    },
    material: {
      type: 'string',
      description: 'Wood material preset (oak, walnut, cherry, maple, ebony, white, birch, mahogany, pine, teak, custom)',
      default: 'walnut',
    },
    customColor: {
      type: 'string',
      description: 'Custom shelf color (CSS color)',
      default: '#5D4037',
    },
    boardThickness: {
      type: 'number',
      description: 'Thickness of shelf boards in pixels',
      default: 18,
    },
    padding: {
      type: 'number',
      description: 'Inner padding of shelf compartments',
      default: 6,
    },
    depth: {
      type: 'number',
      description: 'Visual depth effect intensity (0-100)',
      default: 70,
    },
    shadowIntensity: {
      type: 'number',
      description: 'Shadow intensity (0-100)',
      default: 60,
    },
    highlightIntensity: {
      type: 'number',
      description: 'Highlight intensity (0-100)',
      default: 50,
    },
    backPanelOpacity: {
      type: 'number',
      description: 'Back panel opacity (0-100)',
      default: 90,
    },
    woodGrain: {
      type: 'boolean',
      description: 'Enable wood grain texture effect',
      default: true,
    },
    rounded: {
      type: 'boolean',
      description: 'Enable rounded corners',
      default: false,
    },
    showSlots: {
      type: 'boolean',
      description: 'Show snap slot indicators',
      default: true,
    },
    slotStyle: {
      type: 'string',
      description: 'Style of slot indicators (dots, lines, brackets, subtle)',
      default: 'subtle',
    },
    bevelSize: {
      type: 'number',
      description: 'Edge bevel size for 3D effect (0-10)',
      default: 3,
    },
    glossiness: {
      type: 'number',
      description: 'Surface glossiness/sheen (0-100)',
      default: 25,
    },
  },
  outputs: {
    compartmentClicked: {
      type: 'object',
      description: 'Emitted when a compartment is clicked, includes row and column',
    },
    slotClicked: {
      type: 'object',
      description: 'Emitted when a snap slot is clicked, includes row, column, and slot index',
    },
    configChanged: {
      type: 'object',
      description: 'Emitted when shelf configuration changes',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['config.set', 'config.rows', 'config.dividers', 'config.material', 'ui.show', 'ui.hide'],
    outputs: ['ui.clicked', 'slot.clicked', 'config.changed'],
  },
  size: {
    width: 450,
    height: 350,
    minWidth: 200,
    minHeight: 150,
    scaleMode: 'stretch',
  },
};

export const ShelfWidgetHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: transparent;
    }

    .shelf-container {
      width: 100%;
      height: 100%;
      position: relative;
      display: flex;
      flex-direction: column;
    }

    /* Back panel with depth */
    .shelf-back {
      position: absolute;
      inset: 0;
      z-index: 0;
    }

    /* Main shelf frame */
    .shelf-frame {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      z-index: 1;
    }

    /* Individual shelf row */
    .shelf-row {
      flex: 1;
      display: flex;
      position: relative;
      min-height: 0;
    }

    /* Shelf compartment */
    .shelf-compartment {
      flex: 1;
      position: relative;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .shelf-compartment:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    /* Snap slots container */
    .snap-slots {
      position: absolute;
      bottom: 4px;
      left: 4px;
      right: 4px;
      display: flex;
      justify-content: space-evenly;
      align-items: flex-end;
      gap: 4px;
      pointer-events: none;
    }

    /* Individual snap slot */
    .snap-slot {
      flex: 1;
      height: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      position: relative;
      pointer-events: auto;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 20px;
    }

    .snap-slot:hover {
      background: rgba(139, 92, 246, 0.1);
      border-radius: 4px;
    }

    .snap-slot:hover .slot-indicator {
      opacity: 1;
      transform: scale(1.1);
    }

    /* Slot indicator styles */
    .slot-indicator {
      transition: all 0.2s ease;
    }

    .slot-indicator.dots {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(139, 92, 246, 0.4);
      margin-bottom: 4px;
    }

    .slot-indicator.lines {
      width: 80%;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent);
      margin-bottom: 4px;
    }

    .slot-indicator.brackets {
      width: 90%;
      height: 16px;
      border: 2px solid rgba(139, 92, 246, 0.2);
      border-top: none;
      border-radius: 0 0 4px 4px;
      margin-bottom: 2px;
    }

    .slot-indicator.subtle {
      width: 60%;
      height: 3px;
      background: linear-gradient(90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.08) 20%,
        rgba(255, 255, 255, 0.12) 50%,
        rgba(255, 255, 255, 0.08) 80%,
        transparent 100%
      );
      margin-bottom: 2px;
      border-radius: 1px;
    }

    /* Wood grain overlay */
    .wood-grain {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0.12;
      background-image:
        repeating-linear-gradient(
          87deg,
          transparent,
          transparent 1px,
          rgba(0,0,0,0.03) 1px,
          rgba(0,0,0,0.03) 2px
        ),
        repeating-linear-gradient(
          93deg,
          transparent,
          transparent 2px,
          rgba(0,0,0,0.02) 2px,
          rgba(0,0,0,0.02) 4px
        );
      mix-blend-mode: multiply;
    }

    /* Realistic wood grain texture */
    .wood-grain-realistic {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0.08;
      background:
        repeating-linear-gradient(
          90deg,
          transparent 0px,
          rgba(0,0,0,0.02) 1px,
          transparent 2px,
          transparent 8px
        ),
        repeating-linear-gradient(
          0deg,
          transparent 0px,
          rgba(0,0,0,0.015) 40px,
          transparent 42px,
          transparent 80px
        );
    }

    /* Wood knot effect */
    .wood-knot {
      position: absolute;
      border-radius: 50%;
      background: radial-gradient(
        ellipse at center,
        rgba(0,0,0,0.08) 0%,
        rgba(0,0,0,0.04) 40%,
        transparent 70%
      );
      pointer-events: none;
    }

    /* Gloss/sheen overlay */
    .gloss-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(
        135deg,
        rgba(255,255,255,0.1) 0%,
        transparent 30%,
        transparent 70%,
        rgba(0,0,0,0.05) 100%
      );
    }

    /* Edge highlight */
    .edge-highlight {
      position: absolute;
      pointer-events: none;
    }

    /* Shadow effects */
    .inner-shadow {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 5;
    }

    /* Compartment inner shadows */
    .compartment-shadow {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    /* Dust particles effect (optional) */
    .dust-particles {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0.03;
      background-image:
        radial-gradient(circle at 20% 30%, rgba(255,255,255,0.8) 1px, transparent 1px),
        radial-gradient(circle at 60% 70%, rgba(255,255,255,0.6) 1px, transparent 1px),
        radial-gradient(circle at 80% 20%, rgba(255,255,255,0.5) 1px, transparent 1px),
        radial-gradient(circle at 40% 80%, rgba(255,255,255,0.7) 1px, transparent 1px);
    }
  </style>
</head>
<body>
  <div class="shelf-container" id="shelf">
    <div class="shelf-back" id="back"></div>
    <div class="shelf-frame" id="frame"></div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;
      const shelf = document.getElementById('shelf');
      const back = document.getElementById('back');
      const frame = document.getElementById('frame');

      // Material presets with rich color palettes
      const MATERIALS = {
        oak: {
          base: '#C4A35A',
          dark: '#8B7355',
          light: '#DEC185',
          accent: '#A68B5B',
          grain: '#9A7B45',
          knot: '#7A6035'
        },
        walnut: {
          base: '#5D4037',
          dark: '#3E2723',
          light: '#795548',
          accent: '#4E342E',
          grain: '#3A2820',
          knot: '#2D1F18'
        },
        cherry: {
          base: '#8B4513',
          dark: '#5D2E0C',
          light: '#A0522D',
          accent: '#6B3410',
          grain: '#5A2A0A',
          knot: '#4A2008'
        },
        maple: {
          base: '#DEB887',
          dark: '#B8956B',
          light: '#F5DEB3',
          accent: '#D2B48C',
          grain: '#C8A070',
          knot: '#A08060'
        },
        ebony: {
          base: '#2C2416',
          dark: '#1A1510',
          light: '#3D332A',
          accent: '#252018',
          grain: '#1E1810',
          knot: '#151008'
        },
        white: {
          base: '#F5F5F5',
          dark: '#E0E0E0',
          light: '#FFFFFF',
          accent: '#EEEEEE',
          grain: '#E8E8E8',
          knot: '#D8D8D8'
        },
        birch: {
          base: '#F5E6D3',
          dark: '#D4C4A8',
          light: '#FFF8EE',
          accent: '#E8D5BC',
          grain: '#D8C8B0',
          knot: '#C0B098'
        },
        mahogany: {
          base: '#6B3A3A',
          dark: '#4A2828',
          light: '#8B4A4A',
          accent: '#5A3030',
          grain: '#482525',
          knot: '#381818'
        },
        pine: {
          base: '#E8D0A9',
          dark: '#C9B896',
          light: '#F5E6C8',
          accent: '#DBBF94',
          grain: '#C8B088',
          knot: '#A89068'
        },
        teak: {
          base: '#B8860B',
          dark: '#8B6914',
          light: '#DAA520',
          accent: '#9A7B0A',
          grain: '#7A6008',
          knot: '#5A4506'
        },
        rosewood: {
          base: '#65000B',
          dark: '#4A0008',
          light: '#800010',
          accent: '#550009',
          grain: '#400006',
          knot: '#300004'
        },
        ash: {
          base: '#C8BEB0',
          dark: '#A89E90',
          light: '#E0D8CC',
          accent: '#B8AEA0',
          grain: '#A09690',
          knot: '#888078'
        }
      };

      // Default state
      let state = {
        rows: 3,
        dividers: 2,
        slotsPerCompartment: 3,
        material: 'walnut',
        customColor: '#5D4037',
        boardThickness: 18,
        padding: 6,
        depth: 70,
        shadowIntensity: 60,
        highlightIntensity: 50,
        backPanelOpacity: 90,
        woodGrain: true,
        rounded: false,
        showSlots: true,
        slotStyle: 'subtle',
        bevelSize: 3,
        glossiness: 25
      };

      // Get color from material or custom
      function getColors() {
        if (state.material === 'custom') {
          const base = state.customColor;
          return {
            base: base,
            dark: adjustBrightness(base, -35),
            light: adjustBrightness(base, 35),
            accent: adjustBrightness(base, -18),
            grain: adjustBrightness(base, -25),
            knot: adjustBrightness(base, -40)
          };
        }
        return MATERIALS[state.material] || MATERIALS.walnut;
      }

      // Adjust color brightness
      function adjustBrightness(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, Math.min(255, (num >> 16) + amt));
        const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
        const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
      }

      // Mix two colors
      function mixColors(color1, color2, ratio) {
        const c1 = parseInt(color1.replace('#', ''), 16);
        const c2 = parseInt(color2.replace('#', ''), 16);
        const r1 = (c1 >> 16), g1 = ((c1 >> 8) & 0xFF), b1 = (c1 & 0xFF);
        const r2 = (c2 >> 16), g2 = ((c2 >> 8) & 0xFF), b2 = (c2 & 0xFF);
        const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
        const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
        const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
        return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
      }

      // Generate realistic wood board gradient with bevel
      function getBoardGradient(colors, direction = 'horizontal', position = 'middle') {
        const depth = state.depth / 100;
        const highlight = state.highlightIntensity / 100;
        const shadow = state.shadowIntensity / 100;
        const bevel = state.bevelSize;
        const gloss = state.glossiness / 100;

        if (direction === 'horizontal') {
          // Horizontal board with realistic 3D bevel effect
          const topHighlight = \`rgba(255,255,255,\${0.35 * highlight * (1 + gloss)})\`;
          const topBevel = mixColors(colors.light, '#ffffff', 0.2 * gloss);
          const bottomShadow = \`rgba(0,0,0,\${0.45 * shadow})\`;
          const bottomBevel = colors.dark;

          return \`linear-gradient(180deg,
            \${topHighlight} 0%,
            \${topBevel} \${bevel}px,
            \${colors.light} \${bevel + 2}px,
            \${colors.base} 35%,
            \${colors.base} 65%,
            \${colors.accent} 85%,
            \${bottomBevel} calc(100% - \${bevel}px),
            \${bottomShadow} 100%
          )\`;
        } else {
          // Vertical board (dividers/sides) with side lighting
          const leftHighlight = mixColors(colors.light, '#ffffff', 0.15 * gloss);
          const rightShadow = colors.dark;

          return \`linear-gradient(90deg,
            rgba(255,255,255,\${0.25 * highlight}) 0%,
            \${leftHighlight} \${bevel}px,
            \${colors.light} \${bevel + 2}px,
            \${colors.base} 40%,
            \${colors.base} 60%,
            \${colors.accent} 85%,
            \${rightShadow} calc(100% - \${bevel}px),
            rgba(0,0,0,\${0.35 * shadow}) 100%
          )\`;
        }
      }

      // Generate inner shadow for compartments (realistic inset effect)
      function getCompartmentShadow(rowIdx, colIdx, totalRows, totalCols) {
        const shadow = state.shadowIntensity / 100;
        const depth = state.depth / 100;

        // Multi-layered shadows for realism
        const topShadow = \`inset 0 \${6 * depth}px \${12 * depth}px rgba(0,0,0,\${0.35 * shadow})\`;
        const topSoftShadow = \`inset 0 \${2 * depth}px \${4 * depth}px rgba(0,0,0,\${0.2 * shadow})\`;
        const leftShadow = \`inset \${4 * depth}px 0 \${8 * depth}px rgba(0,0,0,\${0.25 * shadow})\`;
        const rightShadow = \`inset \${-3 * depth}px 0 \${6 * depth}px rgba(0,0,0,\${0.18 * shadow})\`;
        const bottomLight = \`inset 0 \${-2 * depth}px \${4 * depth}px rgba(255,255,255,\${0.05 * shadow})\`;

        return [topShadow, topSoftShadow, leftShadow, rightShadow, bottomLight].join(', ');
      }

      // Create snap slots for a compartment
      function createSnapSlots(compartment, rowIdx, colIdx) {
        if (!state.showSlots) return;

        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'snap-slots';
        slotsContainer.style.height = '85%';

        for (let s = 0; s < state.slotsPerCompartment; s++) {
          const slot = document.createElement('div');
          slot.className = 'snap-slot';
          slot.dataset.row = rowIdx;
          slot.dataset.col = colIdx;
          slot.dataset.slot = s;

          // Slot indicator
          const indicator = document.createElement('div');
          indicator.className = 'slot-indicator ' + state.slotStyle;
          indicator.style.opacity = '0.6';
          slot.appendChild(indicator);

          // Click handler for slot
          slot.addEventListener('click', function(e) {
            e.stopPropagation();
            const row = parseInt(this.dataset.row);
            const col = parseInt(this.dataset.col);
            const slotIdx = parseInt(this.dataset.slot);
            API.emitOutput('slot.clicked', { row, col, slot: slotIdx });
            API.emit('slot-clicked', { row, col, slot: slotIdx });

            // Visual feedback
            this.style.background = 'rgba(139, 92, 246, 0.3)';
            setTimeout(() => {
              this.style.background = '';
            }, 200);
          });

          slotsContainer.appendChild(slot);
        }

        compartment.appendChild(slotsContainer);
      }

      // Add wood knots randomly
      function addWoodKnots(element, count = 2) {
        for (let i = 0; i < count; i++) {
          const knot = document.createElement('div');
          knot.className = 'wood-knot';
          const size = 8 + Math.random() * 12;
          knot.style.cssText = \`
            width: \${size}px;
            height: \${size * (0.6 + Math.random() * 0.4)}px;
            left: \${10 + Math.random() * 80}%;
            top: \${10 + Math.random() * 80}%;
            transform: rotate(\${Math.random() * 360}deg);
          \`;
          element.appendChild(knot);
        }
      }

      // Render the shelf
      function render() {
        const colors = getColors();
        const radius = state.rounded ? '10px' : '2px';
        const thickness = state.boardThickness;
        const depth = state.depth / 100;
        const gloss = state.glossiness / 100;

        // Set CSS variables
        shelf.style.setProperty('--board-thickness', thickness + 'px');
        shelf.style.setProperty('--shelf-radius', radius);
        shelf.style.setProperty('--shelf-padding', state.padding + 'px');

        // Render back panel with depth effect
        const backOpacity = state.backPanelOpacity / 100;
        back.innerHTML = '';
        back.style.background = \`linear-gradient(145deg,
          \${colors.dark} 0%,
          \${adjustBrightness(colors.dark, -8)} 50%,
          \${adjustBrightness(colors.dark, -15)} 100%
        )\`;
        back.style.opacity = backOpacity;
        back.style.borderRadius = radius;
        back.style.boxShadow = \`
          inset 0 0 \${30 * depth}px rgba(0,0,0,\${0.6 * (state.shadowIntensity/100)}),
          inset 0 \${5 * depth}px \${15 * depth}px rgba(0,0,0,\${0.3 * (state.shadowIntensity/100)}),
          0 \${15 * depth}px \${40 * depth}px rgba(0,0,0,\${0.4 * (state.shadowIntensity/100)}),
          0 \${5 * depth}px \${15 * depth}px rgba(0,0,0,\${0.2 * (state.shadowIntensity/100)})
        \`;

        // Add grain to back
        if (state.woodGrain) {
          const backGrain = document.createElement('div');
          backGrain.className = 'wood-grain-realistic';
          backGrain.style.opacity = '0.05';
          back.appendChild(backGrain);
        }

        // Clear frame
        frame.innerHTML = '';

        // Create outer frame structure
        const frameWrapper = document.createElement('div');
        frameWrapper.style.cssText = \`
          position: absolute;
          inset: 0;
          border-radius: \${radius};
          overflow: hidden;
        \`;

        // Add outer frame boards (top, bottom, left, right)
        // TOP BOARD
        const topBoard = document.createElement('div');
        topBoard.style.cssText = \`
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: \${thickness}px;
          background: \${getBoardGradient(colors, 'horizontal', 'top')};
          border-radius: \${state.rounded ? radius + ' ' + radius + ' 0 0' : '2px 2px 0 0'};
          z-index: 20;
          box-shadow:
            0 \${3 * depth}px \${8 * depth}px rgba(0,0,0,\${0.3 * (state.shadowIntensity/100)}),
            inset 0 \${-1}px 0 rgba(0,0,0,\${0.2 * (state.shadowIntensity/100)});
        \`;
        if (state.woodGrain) {
          const grain = document.createElement('div');
          grain.className = 'wood-grain';
          topBoard.appendChild(grain);
          addWoodKnots(topBoard, 1);
        }
        if (gloss > 0.1) {
          const glossOverlay = document.createElement('div');
          glossOverlay.className = 'gloss-overlay';
          topBoard.appendChild(glossOverlay);
        }
        frameWrapper.appendChild(topBoard);

        // BOTTOM BOARD
        const bottomBoard = document.createElement('div');
        bottomBoard.style.cssText = \`
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: \${thickness}px;
          background: \${getBoardGradient(colors, 'horizontal', 'bottom')};
          border-radius: \${state.rounded ? '0 0 ' + radius + ' ' + radius : '0 0 2px 2px'};
          z-index: 20;
          box-shadow:
            0 \${6 * depth}px \${18 * depth}px rgba(0,0,0,\${0.45 * (state.shadowIntensity/100)}),
            0 \${2 * depth}px \${6 * depth}px rgba(0,0,0,\${0.25 * (state.shadowIntensity/100)}),
            inset 0 1px 0 rgba(255,255,255,\${0.1 * (state.highlightIntensity/100)});
        \`;
        if (state.woodGrain) {
          const grain = document.createElement('div');
          grain.className = 'wood-grain';
          bottomBoard.appendChild(grain);
          addWoodKnots(bottomBoard, 1);
        }
        if (gloss > 0.1) {
          const glossOverlay = document.createElement('div');
          glossOverlay.className = 'gloss-overlay';
          bottomBoard.appendChild(glossOverlay);
        }
        frameWrapper.appendChild(bottomBoard);

        // LEFT SIDE
        const leftSide = document.createElement('div');
        leftSide.style.cssText = \`
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: \${thickness}px;
          background: \${getBoardGradient(colors, 'vertical', 'left')};
          border-radius: \${state.rounded ? radius + ' 0 0 ' + radius : '2px 0 0 2px'};
          z-index: 15;
          box-shadow:
            \${3 * depth}px 0 \${8 * depth}px rgba(0,0,0,\${0.25 * (state.shadowIntensity/100)}),
            inset \${-1}px 0 0 rgba(0,0,0,\${0.15 * (state.shadowIntensity/100)});
        \`;
        if (state.woodGrain) {
          const grain = document.createElement('div');
          grain.className = 'wood-grain';
          grain.style.transform = 'rotate(90deg)';
          leftSide.appendChild(grain);
        }
        frameWrapper.appendChild(leftSide);

        // RIGHT SIDE
        const rightSide = document.createElement('div');
        rightSide.style.cssText = \`
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: \${thickness}px;
          background: \${getBoardGradient(colors, 'vertical', 'right')};
          border-radius: \${state.rounded ? '0 ' + radius + ' ' + radius + ' 0' : '0 2px 2px 0'};
          z-index: 15;
          box-shadow:
            \${-3 * depth}px 0 \${8 * depth}px rgba(0,0,0,\${0.2 * (state.shadowIntensity/100)}),
            inset 1px 0 0 rgba(255,255,255,\${0.08 * (state.highlightIntensity/100)});
        \`;
        if (state.woodGrain) {
          const grain = document.createElement('div');
          grain.className = 'wood-grain';
          grain.style.transform = 'rotate(90deg)';
          rightSide.appendChild(grain);
        }
        frameWrapper.appendChild(rightSide);

        // Content area (inside the frame)
        const content = document.createElement('div');
        content.style.cssText = \`
          position: absolute;
          top: \${thickness}px;
          left: \${thickness}px;
          right: \${thickness}px;
          bottom: \${thickness}px;
          display: flex;
          flex-direction: column;
        \`;

        const cols = state.dividers + 1;

        // Create rows
        for (let r = 0; r < state.rows; r++) {
          const row = document.createElement('div');
          row.className = 'shelf-row';
          row.style.cssText = 'flex: 1; display: flex; position: relative; min-height: 0;';

          // Create compartments with dividers
          for (let c = 0; c < cols; c++) {
            const compartment = document.createElement('div');
            compartment.className = 'shelf-compartment';
            compartment.dataset.row = r;
            compartment.dataset.col = c;
            compartment.style.cssText = \`
              flex: 1;
              position: relative;
              margin: \${state.padding}px;
              border-radius: \${state.rounded ? '4px' : '2px'};
            \`;

            // Add inner shadow for depth
            const shadowDiv = document.createElement('div');
            shadowDiv.className = 'compartment-shadow';
            shadowDiv.style.boxShadow = getCompartmentShadow(r, c, state.rows, cols);
            shadowDiv.style.borderRadius = state.rounded ? '4px' : '2px';
            compartment.appendChild(shadowDiv);

            // Add dust particles for realism
            if (state.depth > 50) {
              const dust = document.createElement('div');
              dust.className = 'dust-particles';
              compartment.appendChild(dust);
            }

            // Add snap slots
            createSnapSlots(compartment, r, c);

            // Click handler for compartment
            compartment.addEventListener('click', function(e) {
              if (e.target.closest('.snap-slot')) return;
              const row = parseInt(this.dataset.row);
              const col = parseInt(this.dataset.col);
              API.emitOutput('ui.clicked', { row, col, compartment: row * cols + col });
              API.emit('compartment-clicked', { row, col });
            });

            row.appendChild(compartment);

            // Add divider after compartment (except last)
            if (c < cols - 1) {
              const divider = document.createElement('div');
              divider.style.cssText = \`
                position: relative;
                width: \${thickness * 0.65}px;
                flex-shrink: 0;
                background: \${getBoardGradient(colors, 'vertical')};
                z-index: 10;
                box-shadow:
                  \${3 * depth}px 0 \${6 * depth}px rgba(0,0,0,\${0.22 * (state.shadowIntensity/100)}),
                  \${-2 * depth}px 0 \${4 * depth}px rgba(0,0,0,\${0.12 * (state.shadowIntensity/100)});
              \`;
              if (state.woodGrain) {
                const grain = document.createElement('div');
                grain.className = 'wood-grain';
                grain.style.transform = 'rotate(90deg)';
                divider.appendChild(grain);
              }
              row.appendChild(divider);
            }
          }

          content.appendChild(row);

          // Add shelf board between rows (not after last row)
          if (r < state.rows - 1) {
            const board = document.createElement('div');
            board.style.cssText = \`
              height: \${thickness}px;
              flex-shrink: 0;
              background: \${getBoardGradient(colors, 'horizontal')};
              position: relative;
              z-index: 10;
              box-shadow:
                0 \${4 * depth}px \${10 * depth}px rgba(0,0,0,\${0.3 * (state.shadowIntensity/100)}),
                0 \${1 * depth}px \${3 * depth}px rgba(0,0,0,\${0.15 * (state.shadowIntensity/100)}),
                inset 0 1px 0 rgba(255,255,255,\${0.08 * (state.highlightIntensity/100)});
            \`;
            if (state.woodGrain) {
              const grain = document.createElement('div');
              grain.className = 'wood-grain';
              board.appendChild(grain);
              if (Math.random() > 0.5) {
                addWoodKnots(board, 1);
              }
            }
            if (gloss > 0.1) {
              const glossOverlay = document.createElement('div');
              glossOverlay.className = 'gloss-overlay';
              board.appendChild(glossOverlay);
            }
            content.appendChild(board);
          }
        }

        frameWrapper.appendChild(content);
        frame.appendChild(frameWrapper);
      }

      // Initialize
      API.onMount(function(context) {
        if (context.state) {
          state = { ...state, ...context.state };
        }
        render();
        API.log('ShelfWidget mounted with ' + state.rows + ' rows, ' + state.dividers + ' dividers, ' + state.slotsPerCompartment + ' slots per compartment');
      });

      // Handle full config input
      API.onInput('config.set', function(config) {
        state = { ...state, ...config };
        render();
        API.setState(state);
        API.emitOutput('config.changed', state);
      });

      // Handle individual config inputs
      API.onInput('config.rows', function(value) {
        state.rows = Math.max(1, Math.min(10, parseInt(value) || 3));
        render();
        API.setState(state);
        API.emitOutput('config.changed', state);
      });

      API.onInput('config.dividers', function(value) {
        state.dividers = Math.max(0, Math.min(10, parseInt(value) || 2));
        render();
        API.setState(state);
        API.emitOutput('config.changed', state);
      });

      API.onInput('config.material', function(value) {
        if (MATERIALS[value] || value === 'custom') {
          state.material = value;
          render();
          API.setState(state);
          API.emitOutput('config.changed', state);
        }
      });

      // Show/hide
      API.onInput('ui.show', function() {
        shelf.style.display = 'flex';
      });

      API.onInput('ui.hide', function() {
        shelf.style.display = 'none';
      });

      // State changes
      API.onStateChange(function(newState) {
        state = { ...state, ...newState };
        render();
      });

      // Cleanup
      API.onDestroy(function() {
        API.log('ShelfWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const ShelfWidget: BuiltinWidget = {
  manifest: ShelfWidgetManifest,
  html: ShelfWidgetHTML,
};
