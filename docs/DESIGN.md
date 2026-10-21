# Sworn design implementation

## Overview

Sworn is an ownerless Ethereum registry for readers exploring wallet facts, wallets minting their card, and builders integrating those facts. The existing terminal style is preserved: near-black surfaces, green hive artwork, monospace text, square controls, compact data, thin rules, and citations next to claims. The landing page leads with an address lookup; Claim leads with card preparation.

The assignment permits `web/**`, `dist/**` and `docs/**`. This document fulfils the requested root `DESIGN.md` content within `docs/`; a new root document would violate that explicit path budget.

## Colors

Canonical definitions are in `web/src/styles.css`, using the existing hexadecimal notation.

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0a0a0a` | Page, fields, modal and flat panels |
| `--text` | `#d9e0da` | Main copy, focus outline |
| `--muted` | `#8c968e` | Supporting text, source line numbers |
| `--faint` | `#5f6861` | Field and wallet sheet borders, large step numerals |
| `--rule` | `#1f1f1f` | Section and panel boundaries |
| `--row-rule` | `#151515` | Table separators, selected backgrounds |
| `--accent` | `#00ff41` | Links, filled primary actions, current navigation, confirmed status |
| `--direct` | `#00cc33` | Direct fact class |
| `--shared` | `#dbfee6` | Shared fact class and pressed action state |
| `--panel` | `#8ff0a4` | Panel fact class |
| `--danger` | `#ff7777` | Error, rejected, failed and unknown states |

Class names and state words accompany color. Source line numbers use `--muted`, rather than the earlier low-contrast faint value. The design probe checks rendered solid foreground/background pairs; see validation evidence for actual measured results and exclusions for artwork. There is one dark theme; no theme switch or unused color ramp is added.

## Typography

`--mono` is `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`; the site intentionally uses system monospace for prose and data. No remote font is required. The requested weights are 400, 500 and 600; the actual system face varies by operating system. Root line height is 1.55 with tabular numerals and root font smoothing.

| Token | Size | Role |
| --- | --- | --- |
| `--type-citation` | 11px | Citations, table headers, footer metadata |
| `--type-small` | 12px | Table content, secondary labels |
| `--type-body` | 13px | Main UI copy, controls, guard reasons and action status |
| `--type-prose` | 15px | Reading paragraphs, section headings, mint heading |
| `--type-heading` | 24px | Page titles and numbered steps |
| `--type-display` | 34px | Landing headline |
| `--type-input` | 16px | Mobile input/select/textarea exception to prevent iOS focus zoom |
| `--type-close` | 20px | Wallet dialog close glyph |

The six content sizes form the shared scale. `.prose` and `.measure` use 15px/1.6; `h1` uses 24px/1.3, with the landing at 34px/1.25. Ordinary `h2`/`h3` use 15px/1.55. Citations have a 24px minimum link target. Rules, consequences and instructions use body/small text, rather than the removed 10px citation treatment. Full addresses and critical integers wrap without ellipsis.

The inherited uppercase section/table labels and tracked brand remain part of the approved visual identity. They are documented exceptions to the probe's generic casing/tracking preferences. Code and exact numeric values stay selectable.

## Layout

`web/src/styles.css` defines `--space-1` through `--space-9` as 4, 8, 12, 16, 20, 24, 28, 32 and 36px. Shared gaps and padding reuse those tokens; established non-scale dimensions remain where needed for controls and artwork.

The page maximum is 1200px, with 32px horizontal gutters. `.narrow` caps Claim at 976px. The landing is a two-column introduction/card layout; the Explorer uses a 300px card beside its family summary. Sections have 30px vertical padding. Main top padding is 38px. Controls have at least 44px height and wallet rows at least 48px.

Responsive adaptations:

- At 1100px the navigation occupies a second row, Connect follows as the last visual control, and address controls may wrap.
- At 900px the four class cards form two columns.
- At 780px the landing, Explorer, mint block and three-column content stack. Mint controls precede their image.
- At 640px class cards and flow diagrams stack; the wallet dialog becomes a bottom sheet.
- At 600px gutters become 16px, main top padding becomes 24px, inputs use 16px text, info boxes and address details become one column, and the desktop deposits chart is omitted. The hourly table still contains every value.

`Table` in `web/src/components.tsx` annotates cells with their column label and uses `.responsive-table` by default. At 600px and below it presents rows as readable grids, rather than sideways tables. Catalog rows place id/name first, rule next, and window/population together. Explorer family and per-id rows keep their answers first with evidence below. Claim steps span the full content width, with their numeral on the heading row. Only the 66-hour table opts into `scrollOnly`, with a scrolling note above the keyboard-focusable region. Long code blocks keep their own horizontal scroll and visible cue.

## Elevation & Depth

Surfaces are flat; there are no panel shadows or gradient text. Borders communicate structure, selection and focus. The native wallet dialog has a black 75% backdrop, a faint border, 16px inner padding and a width of at most 420px on desktop. It is above the inert page while open. No animation or autoplay is present.

## Shapes

Controls and panels are square (`border-radius: 0`). The tiny rare-fact dot is intentionally round. Hive illustrations retain the deployed Renderer's geometry. Critical content is never clipped to create a visual shape.

## Components

- `AddressForm` (`web/src/components.tsx`): persistent label, pasteable address input, inline validation and Explore wallet action. Mobile uses the format hint `0x… (42 characters)`. Invalid submission focuses the field.
- `Section`, `Source`, `ClassMark`, `Table`, `MiniCard`: shared page primitives. Citations link to their actual catalog section or Registry source/read tab. Mini cards are explicitly synthetic illustrations generated through the deployed Renderer.
- Header (`web/src/main.tsx`): DOM order is brand, navigation, Connect. The active route is announced with `aria-current`. Route changes update title and move focus to the main region or requested anchor.
- Wallet (`web/src/ConnectSheet.tsx`): native modal dialog, named EIP-6963 extension marks, browser fallback, Coinbase Wallet/passkeys and four phone deep links. Escape, backdrop and close dismiss it; focus returns to the trigger. Pending/rejected states are inline. Connected controls expose account, switch and disconnect.
- Buttons/fields (`web/src/styles.css`): filled primary, outlined secondary, visible hover/active/disabled states and a two-pixel focus ring. Inputs keep labels; checkbox text shares its hit target. Forced-colors uses system outline/border colors.
- Claim (`web/src/Claim.tsx`): wallet-specific minted/preview card, one shared payment radiogroup, steps 01–03, a shared oracle acknowledgement beside its first gated action, local action status and disabled reasons. Impossible Curator facts are explained and unavailable; free direct reads remain available.
- Journal (`web/src/flow.ts`, `Claim.tsx`): exact amount and per-fact prices, origin link, separate purchase/approval/Registry confirmations, receipt recovery, named step states and local errors. Reload never automatically sends a transaction.
- Explorer (`web/src/pages.tsx`): pinned-block reads, wallet summary, 25 fact results, requestability, accepted windows, lossless raw metadata, unavailable state and Retry reads.
- Integration (`web/src/pages.tsx`): live-address code examples, Copy action and local copy result for each block, downloadable examples, and scrolling cues.

## Do's and Don'ts

Reuse the existing page container, `Section`, `Table` and tokens for another page. Use a filled action for the primary task and the secondary style for supporting actions. Keep the main control on the first phone screen and put consequences, cost and errors beside the affected action.

Preserve the hive artwork and terminal identity. Use words alongside status colors, full wrapping addresses, exact integer formatting and citations to the relevant source. Keep runtime addresses/chain/ABIs derived from the exported deployment manifest. Do not present an illustration as a live result, treat card ownership as a credential, or enable a transaction before the deployment and wallet checks pass.

Design guidance attribution is retained in `web/LICENSES/Better-Interface.txt`, and wallet mark attribution in `web/LICENSES/RainbowKit.txt`. Actual review coverage, findings, browser results and unperformed checks are recorded in `web/TEST-NOTES.md`.
