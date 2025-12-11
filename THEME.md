# Orbits Design System 🪐

This document outlines the global design tokens, UI patterns, and aesthetic guidelines for the **Orbits** application. The visual identity is built around a **"Premium Dark Glass"** aesthetic, emphasizing depth, transparency, and fluidity.

## 🎨 Core Aesthetic
**"Deep Space Glassmorphism"**
*   **Backgrounds:** Deep, rich darks (`#000000`, `#0d0f18`) rather than flat grays.
*   **Surface:** Translucent glass layers with backdrop blurs.
*   **Borders:** Subtle, 1px white/10% borders to define edges without heavy lines.
*   **Geometry:** heavily rounded corners (`rounded-3xl`) for a floating, organic feel.

---

## 🌈 Color Palette

### Base Layers
| Token | Hex Value | Tailwind Class | Usage |
| :--- | :--- | :--- | :--- |
| **Void Black** | `#000000` | `bg-black` | Main background, video backing |
| **Deep Space** | `#0d0f18` | `bg-[#0d0f18]` | App background wrapper |
| **Glass Low** | `rgba(0,0,0, 0.5)` | `bg-black/50` | Video containers, lower layers |
| **Glass High** | `rgba(0,0,0, 0.8)` | `bg-black/80` | Sidebars, active elements |
| **Overlay** | `rgba(255,255,255, 0.05)` | `bg-white/5` | Hover states, headers |

### Accents
| Token | Hex Value | Tailwind Class | Usage |
| :--- | :--- | :--- | :--- |
| **Orbit Blue** | `#2563eb` | `text-blue-600` | Primary actions, links, focus rings |
| **Signal Red** | `#ef4444` | `bg-red-500` | Recording, Live indicators, destructive |
| **Nebula Text** | `rgba(255,255,255, 0.9)` | `text-white/90` | Primary headings |
| **Stardust** | `rgba(255,255,255, 0.5)` | `text-white/50` | Secondary text, icons |

---

## 📐 Layout & Spacing

### The "Floating" Concept
The UI avoids attaching elements to the screen edges. Instead, major components "float" with padding.

*   **Main Container:** `absolute inset-0 p-4`
*   **Video Card:** `rounded-3xl` (24px radius)
*   **Sidebars:** Floating overlays, positioned `right-4 top-4 bottom-4`, `w-[400px]`
*   **Dock:** Floating pill shape, `bottom-0`, centered.

### Spacing Tokens
*   **Gap Small:** `gap-2` (8px) - Within buttons
*   **Gap Medium:** `gap-4` (16px) - Between major panels
*   **Padding Card:** `p-4` or `p-6`

---

## 🔤 Typography
**Font Family:** `Inter`, `system-ui`, `-apple-system`.

| Role | Style | Tailwind |
| :--- | :--- | :--- |
| **Brand Logo** | Semibold, Tracking Wide | `font-semibold tracking-wide` |
| **Heading** | Semibold, White/90 | `text-sm font-semibold text-white/90` |
| **Body** | Regular, White/80 | `text-sm text-white/80` |
| **Label** | Medium, White/50 | `text-xs font-medium text-white/50` |

---

## 🎭 Motion & Interaction
Powered by **Framer Motion**.

*   **Transitions:** Spring physics (stiff: 300, damping: 30) for natural snap.
*   **Hover:** Subtle scale (`scale-105`) or background fade (`hover:bg-white/10`).
*   **Entrance:** Fade in + Slide Up (`y: 80 -> y: 0`).
*   **Micro-interactions:** Pulsing dots for "Live" status.

---

## 🧱 Component Patterns

### 1. Glass Card
The fundamental building block.
```jsx
<div className="rounded-3xl border border-white/10 bg-black/50 backdrop-blur-xl shadow-2xl">
  {content}
</div>
```

### 2. Sidebar Header
Standardized header for all panels.
```jsx
<div className="flex h-[60px] items-center justify-between border-b border-white/10 bg-white/5 px-6">
  <h2 className="text-sm font-semibold text-white/90">Title</h2>
  <CloseButton />
</div>
```

### 3. Iconic Button
Used in docks and toolbars.
```jsx
<button className="flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-2 hover:bg-white/10">
  <Icon className="h-5 w-5" />
  <span>Label</span>
</button>
```
