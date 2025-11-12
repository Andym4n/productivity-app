# Leet-Inspired UI Style Reference

## 🎨 Color Palette

| Usage | Hex | Description |
|--------|------|-------------|
| Primary background | `#0B0E14` | Deep navy black – gives a cinematic, high-contrast backdrop |
| Secondary background | `#111827` | Slightly lighter dark tone used in cards and panels |
| Gradient accent (left panels) | `linear-gradient(135deg, #1E293B 0%, #0F172A 50%, #1E40AF 100%)` | Smooth bluish gradient from deep blue to indigo |
| Highlight gradient | `linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)` | Used for call-to-action buttons or progress indicators |
| Text primary | `#FFFFFF` | White for strong contrast |
| Text secondary | `#94A3B8` | Muted blue-gray for descriptions |
| Border / outline | `#1E293B` | Subtle borders that blend into the background |
| Accent purple | `#8B5CF6` | Primary accent (used for icons, numbers, buttons) |
| Accent blue | `#3B82F6` | Secondary accent (used for gradients or active states) |

---

## 🧱 UI Components

### Cards & Containers
- Rounded corners: `border-radius: 12px;`
- Border: `1px solid rgba(255, 255, 255, 0.05);`
- Shadow: `0 4px 30px rgba(0, 0, 0, 0.4);`
- Padding: `24px 28px`
- Layout: Grid (2 or 3 columns), with `gap: 24px`

### Buttons
```css
background: linear-gradient(90deg, #8B5CF6 0%, #6366F1 100%);
color: white;
border-radius: 8px;
padding: 12px 20px;
font-weight: 500;
transition: all 0.2s ease;
```
- Hover: `box-shadow: 0 0 12px rgba(139, 92, 246, 0.4);`

### Input Fields
```css
background-color: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
color: #fff;
border-radius: 8px;
padding: 12px 16px;
```
- Focus: border changes to `#8B5CF6` glow

### Section Headers
- Uppercase label: small font, letter-spacing `1px`, color `#64748B`
- Main heading: 28–36px, bold, white
- Subtext: 16px, regular, `#94A3B8`

---

## 🧭 Layout Patterns
- Two-column layouts separated by a vertical line or color contrast
- Consistent spacing: `max-width: 1200px; margin: 0 auto; padding: 60px 40px;`
- Grid sections for stats (like “Pending Requests,” “Shared Projects”) using equal-sized boxes with faint borders and subtle hover elevation.
- Subtle glass effect on some panels:
  ```css
  background: rgba(17, 24, 39, 0.7);
  backdrop-filter: blur(10px);
  ```

---

## 🖋 Typography
- Font: *Inter*, *Satoshi*, or *DM Sans*
- Weight hierarchy:
  - Headings: 600–700
  - Subheadings: 500
  - Body: 400
- Size scale:
  - H1: 36px
  - H2: 24px
  - Body: 14–16px
  - Small label: 12px

---

## 💡 Application Ideas for Schedule Tracker
- Use dark background + gradient header area (like the “Welcome back, creator” section).
- Display daily stats (tasks completed, goals hit, streaks) in bordered cards with subtle glow.
- Use purple gradient buttons for “Add Task,” “Start Focus Timer,” etc.
- Incorporate step cards or workflow sections like “Ride the Leet-led creative loop” for onboarding or progress steps.
- Optional: add subtle animations (hover glows, smooth transitions) for a “premium” feel.
