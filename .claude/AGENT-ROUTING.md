# Agent Routing Cheat-Sheet

Quick reference for finding the right agent based on the problem you're facing.

## Problem → Agent(s)

### Widget & State Issues

| Problem | Primary Agent | Secondary Agent |
|---------|---------------|-----------------|
| Widget behaves strangely across reloads | Morgan (State Management Integrity) | Quinn (Failure Modes) if unclear |
| Widget-to-widget communication feels messy | Alex (Event Bus Governance) | Jordan (Permissions) if scope unclear |
| "This broke something that used to work" | Quinn (Failure Modes) | Morgan (State Integrity) |
| Adding a new widget type | Widget Protocol Keeper | Taylor (Marketplace) if monetizable, Alex (Event Bus) if emitting events |
| Stickers acting like mini-widgets | Luna (Sticker Systems) | Jordan (Permissions & Capability) |

### Canvas & Environment

| Problem | Primary Agent | Secondary Agent |
|---------|---------------|-----------------|
| Canvas UI should react to widget state | Eden (Canvas Environment & Theme Token) | Kai (Widget-to-Environment Mediation) |
| Customization feels chaotic | Kai (Widget-to-Environment Mediation) | — |

### 3D & Spatial

| Problem | Primary Agent | Secondary Agent |
|---------|---------------|-----------------|
| 3D object editing feels confusing | Lee (3D Authoring Experience) | Avery (Camera & View Control) |
| 3D widget tanks performance | Blake (3D Widget Performance) | Jamie (VR Device Compatibility) if headset-specific |
| Users getting disoriented in 3D | Avery (Camera & View Control) | Noah (Spatial UI & HUD) |

### Import / Export

| Problem | Primary Agent | Secondary Agent |
|---------|---------------|-----------------|
| "Can users download this?" | Riley (Export & Interoperability) | — |
| Importing files breaks things | Casey (Import & Ingestion) | Quinn (Failure Modes) |

### Monetization & Collaboration

| Problem | Primary Agent | Secondary Agent |
|---------|---------------|-----------------|
| Planning paid widgets / packs | Taylor (Marketplace Readiness) | Jordan (Permissions) |
| Multi-user idea comes up | Sam (Collaboration & Presence) | Morgan (State Integrity), Jordan (Permissions) |

### VR / AR

| Problem | Primary Agent | Secondary Agent |
|---------|---------------|-----------------|
| VR feature only works on some headsets | Jamie (VR Device Compatibility) | — |
| Users report VR discomfort | Rowan (VR Locomotion & Comfort) | Sally (VR Comfort) |
| AR placement feels unreliable | Sky (AR Environment Understanding) | — |
| AR session loses progress | River (AR Session Lifecycle) | — |

### Cross-Cutting

| Problem | Primary Agent | Secondary Agent |
|---------|---------------|-----------------|
| Feature only works in one mode | Jules (Cross-Mode Parity) | — |
| Users confused switching modes | Jules (Cross-Mode Parity) | — |

---

## Rule of Thumb

- **Architectural issue** → Phase 1 agent first
- **Experiential issue** → Phase 2 agent
- **Futuristic concern** → Phase 3 agent (usually no-op for now)

## Quick Agent Lookup by Phase

### Phase 1 — Core Guardians (Always On)
- Atlas (Meta-Guardian)
- Alex (Event Bus Governance)
- Morgan (State Management Integrity)
- Jordan (Permissions & Capability)
- Quinn (Failure Modes & Chaos)
- Dana (Documentation Continuity)

### Phase 2 — Conditional Specialists
- Riley (Export) / Casey (Import)
- Taylor (Marketplace Readiness)
- Lee (3D Authoring) / Avery (Camera) / Noah (Spatial UI)
- Eden (Theme Tokens) / Kai (Mediation)
- Luna/Finn/Ivy (Sticker Systems)
- Orion/Nova/Pax (Pipeline Systems)

### Phase 3 — Dormant / Future
- VR agents (Jamie, Rowan, Sally)
- AR agents (Sky, River)
- Jules (Cross-Mode Parity)
- Multi-user agents (Remy, Echo, Sol, Vale, Ash, Wren, Ember)
