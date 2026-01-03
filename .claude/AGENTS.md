# StickerNest Agent System

This document defines the internal agent framework used to govern development decisions, prevent architectural drift, and scale StickerNest safely.

## Agent Phases

### Phase 1 — Core Guardians (Always On)

These agents protect system stability and must be respected for all changes.

| Agent | Name | Focus |
|-------|------|-------|
| Meta-Guardian | Atlas | Supervises all changes, routes to specialists |
| Event Bus Governance | Alex | Event naming, sprawl prevention |
| State Management Integrity | Morgan | State consistency, desync detection |
| Permissions & Capability | Jordan | Permission layers, capability boundaries |
| Failure Modes & Chaos | Quinn | Edge cases, failure scenarios |
| Documentation Continuity | Dana | Knowledge preservation |

### Phase 2 — Conditional Specialists

Activated only when a feature explicitly requires them.

**Import/Export**
- Export & Interoperability (Riley)
- Import & Ingestion (Casey)

**Monetization**
- Marketplace & Monetization Readiness (Taylor)

**Canvas Environment**
- Canvas Environment & Theme Token (Eden)
- Widget-to-Environment Mediation (Kai)

**3D Widgets**
- 3D Widget Architecture (Theo)
- 3D Widget Interaction (Mira)
- 3D Widget Performance (Blake)
- 3D Widget Persistence (Rowan)
- 3D Widget Visual Identity (Sage)

**Stickers**
- Sticker Systems (Luna)
- Sticker Interaction (Finn)
- Sticker Visual Identity (Ivy)

**Pipelines**
- Pipeline Architecture (Orion)
- Pipeline Execution & Scheduling (Nova)
- Pipeline Debugging & Introspection (Pax)

**3D Authoring & Camera**
- 3D Authoring Experience (Lee)
- Camera & View Control (Avery)
- Spatial UI & HUD (Noah)

### Phase 3 — Dormant / Future

Present for foresight, not active use.

**VR**
- VR Device Compatibility (Jamie)
- VR Locomotion & Comfort (Rowan)
- VR Comfort (Sally)

**AR**
- AR Environment Understanding (Sky)
- AR Session Lifecycle (River)

**Cross-Mode**
- Cross-Mode Parity (Jules)

**Multi-User**
- Multi-User Architecture (Remy)
- Presence & Awareness (Echo)
- Real-Time Sync Strategy (Sol)
- Conflict Resolution (Vale)
- Ownership & Attribution (Ash)
- Permissions & Roles (Wren)
- Multi-User Onboarding (Ember)
- Collaboration & Presence (Sam)

---

## Core Principles

1. **Single-user experience must remain pristine.** Multi-user features must not degrade solo use.

2. **Widgets express intent; environments interpret it.** Widgets don't control styling directly.

3. **No agent rewrites working systems by default.** Prefer incremental improvement.

4. **Architecture favors reversibility and clarity.** Avoid one-way doors.

5. **Phase 2/3 agents are dormant until explicitly activated.** Don't prematurely optimize for future features.

---

## Usage

When working with coding agents, prompts should include:

> "Only invoke Phase 2 or Phase 3 agents if explicitly required."

### Invoking an Agent

Use the agent routing cheat-sheet (`.claude/AGENT-ROUTING.md`) to find the right agent for your problem.

### Agent Files

All agent definitions live in `.claude/agents/`. Each file contains:
- Agent name and persona
- Primary responsibilities
- Constraints
- Outputs produced
- When to use

---

## Adding New Agents

1. Create a markdown file in `.claude/agents/`
2. Follow the existing format (name, responsibilities, constraints, outputs, triggers)
3. Assign to appropriate phase
4. Update this document and the routing cheat-sheet
