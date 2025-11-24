# Design Guidelines: Real Estate AI Lead Inbox MVP

## Design Approach
**Selected System**: Fluent Design + Modern SaaS Patterns (Linear/Notion-inspired)
**Rationale**: This productivity tool requires clear information hierarchy, efficient form interactions, and professional data presentation. Fluent Design provides excellent structure for business applications while modern SaaS patterns ensure a contemporary feel.

## Core Design Principles
1. **Clarity First**: Every element serves the agent's workflow - analyze, review, copy, act
2. **Scannable Information**: Clear visual hierarchy for quick decision-making
3. **Touch-Friendly**: All interactive elements sized for mobile use (min 44px tap targets)

---

## Typography

**Font Families**:
- Primary: 'Noto Sans TC' (Traditional Chinese optimization)
- Monospace: 'Fira Code' (for message display areas)

**Type Scale**:
- Page Title: text-3xl font-semibold (買家訊息分析系統)
- Section Headers: text-xl font-semibold (輸入區塊, AI 分析結果)
- Card Titles: text-lg font-medium
- Labels: text-sm font-medium
- Body Text: text-base
- Helper Text: text-sm text-opacity-70
- Lead Score Badge: text-xs font-bold uppercase

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16** (e.g., p-4, gap-6, mb-8)

**Container Strategy**:
- Max width: max-w-4xl mx-auto (readable content width)
- Page padding: px-4 md:px-6 lg:px-8
- Vertical rhythm: py-8 md:py-12 between major sections

**Grid System**:
- Input form: Single column, full-width on mobile
- Results cards: Single column stack on mobile, evaluate 2-column on tablet+ if space allows
- Form fields: Consistent spacing with gap-4 between fields

---

## Component Library

### Input Section (上方區塊)

**Message Textarea**:
- Min height: 180px
- Border: 2px solid with rounded-lg corners
- Padding: p-4
- Font: monospace for message readability
- Placeholder styling: subtle, italicized

**Form Dropdowns** (訊息來源, 客戶類型, 回覆語言):
- Height: h-12
- Full width on mobile, consider grid layout (grid-cols-2) on desktop
- Rounded: rounded-lg
- Clear visual separation between label and control

**Submit Button**:
- Primary action: Large, prominent
- Full width on mobile, max-w-xs on desktop
- Height: h-14
- Rounded: rounded-lg
- Icon: Include right arrow or sparkle icon from Heroicons
- Position: Centered below form with mt-8

### Results Section (下方區塊)

**Card Structure** (3 cards total):
- Background: Elevated surface appearance
- Padding: p-6
- Rounded: rounded-xl
- Border: 1px solid with subtle shadow
- Spacing between cards: gap-6

**Card 1 - 客戶評分**:
- Lead Score Badge: Large, pill-shaped, positioned top-right or centered
  - HOT: Urgent visual treatment
  - WARM: Moderate attention treatment  
  - COLD: Low priority treatment
- Layout: Grid with score badge prominent, followed by reason text (text-base), follow-up timing (text-sm font-medium), and follow-up message in a bordered box with copy button

**Card 2 - 買家資料**:
- Definition list layout (dt/dd pairs)
- Label-value pairs with gap-2
- Labels: text-sm font-medium with opacity
- Values: text-base
- Grid: grid-cols-1 md:grid-cols-2 for efficient space use
- Empty states: Show "--" for null values

**Card 3 - AI 建議回覆**:
- Three reply options as separate blocks
- Each reply in bordered container with p-4
- Option number badge (回覆選項 1, 2, 3) as text-xs font-semibold
- Copy button positioned top-right of each reply block
- Reply text: text-base leading-relaxed for readability

### Interactive Elements

**Copy Buttons**:
- Icon-only on mobile (clipboard icon from Heroicons)
- Icon + "複製" text on desktop
- Size: h-10 px-4
- Rounded: rounded-md
- Visual feedback: Transform scale on click
- Position: Consistently top-right or bottom-right of content blocks

**Loading State**:
- Full-screen overlay with centered spinner
- Backdrop blur effect
- Message: "AI 正在分析買家訊息..." with text-lg

---

## Page Structure

**Header**:
- Application title with icon (home or message icon from Heroicons)
- Minimal, clean: h-16 with border-bottom
- Padding: px-4 md:px-6

**Main Content**:
- Two-section vertical layout
- Input section with distinct visual container
- Results section appears below after submission
- Smooth scroll to results after AI completion

**Responsive Behavior**:
- Mobile-first: All single column
- Tablet (768px+): Form dropdowns can use 2-column grid
- Desktop (1024px+): Maintain readable width with max-w-4xl

---

## Spacing & Rhythm

**Form Field Spacing**: gap-6 between form groups
**Card Internal Spacing**: p-6 with gap-4 for internal elements
**Section Separation**: mb-12 between input and results
**Button Margins**: mt-8 for primary submit, mt-4 for copy buttons

---

## Accessibility

- All form inputs have associated labels (not just placeholders)
- Copy button success state shows checkmark icon + "已複製" text briefly
- Keyboard navigation: Tab order follows visual flow
- Form validation messages appear below fields with text-sm
- High contrast for all text-background combinations
- Focus states: 2px outline offset with rounded corners

---

## Images

**No hero image required** - This is a functional business tool focused on form input and data display. Visual emphasis should be on clarity and usability rather than marketing imagery.