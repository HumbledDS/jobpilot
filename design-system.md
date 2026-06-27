# JobPilot — Design System

**Concept: "Terminal Control Center."** A career operating system that reads as *engineered* — built by a Data/Cloud engineer, for one. Near‑monochrome canvas, a single teal signal accent, monospaced tabular metrics, hairline borders, restrained motion. The opposite of generic "AI slop" (no Inter‑on‑white, no purple gradients, no shadow‑heavy rounded cards everywhere).

Distilled from public, verified design references:
- Vercel **Geist** design system — near‑monochrome, single accent, tabular numerals · https://vercel.com/geist
- Rauno Freiberg, **Web Interface Guidelines** · https://interfaces.rauno.me
- Emil Kowalski, **design‑eng / motion** skill · https://github.com/emilkowalski/skills
- Adam Wathan & Steve Schoger, **Refactoring UI** (principles)

## Brand
- **Name / wordmark:** JobPilot, tight tracking, preceded by a pulsing teal "live" status dot. Eyebrow `CAREER OS · v1` in mono.
- **Voice:** precise, operator‑grade, French. Labels are short mono eyebrows (`STATUS`, `OPERATOR`).

## Tokens (`src/app/globals.css`, Tailwind v4 `@theme`)
| Token | Value | Use |
|---|---|---|
| `--color-canvas` | `#f5f6f7` | app background (+ faint dot‑grid texture) |
| `--color-surface` | `#ffffff` | cards / inputs |
| `--color-ink` | `#141619` | primary text, primary buttons |
| `--color-muted` | `#5b616b` | secondary text |
| `--color-faint` | `#9aa0a8` | eyebrows, hints |
| `--color-line` | `#e6e8ea` | hairline borders / dividers |
| `--color-line-strong` | `#d3d7db` | stronger borders, dashed empties |
| `--color-accent` | `#0d9488` | links, active nav, focus, brand highlights |
| `--color-accent-strong` | `#0f766e` | accent hover / text on soft |
| `--color-accent-soft` | `#e3f3f0` | accent tints (chips, coach card) |

Semantic status colors are kept distinct from the brand accent: emerald = positive/money/growth, amber = warn/ESN, rose = danger/refus, violet = AI.

## Typography
- **Geist Sans** (UI, headings — tracking `-0.021em` on h1–h3).
- **Geist Mono** for everything numeric or machine: KPI values, scores, dates, IDs, source pills, eyebrows. Always `tabular-nums` (`.tnum`) so numbers don't shift.
- Helpers: `.mono`, `.tnum`, `.eyebrow` (mono uppercase, 0.09em tracking, faint).

## Depth, borders, motion
- **1px hairline borders + very soft shadow** (`0 1px 2px rgba(20,22,25,.04)`). No heavy drop shadows.
- Focus = accent **box‑shadow ring** (respects radius), never `outline`.
- Motion < 200ms, `ease-out` for entries. Button `:active { transform: scale(.97) }`. `prefers-reduced-motion` honored globally.

## Components
- `.btn-primary` — ink background, white text, press‑scale. `.btn-ghost` — hairline neutral.
- `.input` — hairline, accent focus ring.
- `Card` — `border-line` + soft shadow, `rounded-xl`.
- `StatCard` — mono eyebrow label + large `mono tnum` value (the signature metric look).
- `Sidebar` — pulsing status dot wordmark, mono row indices `00–09`, active row = ink fill; `OPERATOR` footer.

## Avoid (AI‑slop tells)
Inter/Roboto defaults · purple/blue gradients · glassmorphism · uniform heavy‑shadow card grids · emoji as icons · `outline` focus rings · non‑tabular numbers in tables · font‑weight/size shift on hover.
