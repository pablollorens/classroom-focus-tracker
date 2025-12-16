# Classroom Focus Tracker - Rediseño + Calendario - Plan de Implementación

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rediseñar completamente la UI con el sistema de diseño de Stitch y añadir sistema de calendario para programar clases.

**Architecture:** Next.js App Router con Prisma ORM. Sistema de estilos DRY con Tailwind CSS y shadcn/ui. Drag & drop con dnd-kit. Real-time con Supabase.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Prisma, PostgreSQL, shadcn/ui, dnd-kit, Material Symbols

**Design Document:** `docs/plans/2025-12-16-redesign-calendar-design.md`

---

## Fase 1: Fundamentos (Base de datos y estilos)

---

### Task 1: Actualizar Prisma Schema - Modelo Resource

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Añadir modelo Resource al schema**

Añadir después del modelo `Teacher`:

```prisma
model Resource {
  id        String   @id @default(cuid())
  title     String
  type      String   // VIDEO, PDF, URL, TEXT
  url       String?  // null para TEXT
  content   String?  // contenido para TEXT
  duration  Int?     // minutos estimados
  teacherId String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  teacher   Teacher    @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  exercises Exercise[]
}
```

**Step 2: Añadir relación resources a Teacher**

En el modelo `Teacher`, añadir:

```prisma
  resources Resource[]
```

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "schema: add Resource model for shared library"
```

---

### Task 2: Actualizar Prisma Schema - Modelo ScheduledClass

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Añadir modelo ScheduledClass**

Añadir después del modelo `Resource`:

```prisma
model ScheduledClass {
  id               String    @id @default(cuid())
  teacherId        String
  groupId          String
  preparedLessonId String
  dayOfWeek        Int?      // 0-6 para recurrentes (0=Domingo), null para puntuales
  specificDate     DateTime? // fecha específica para puntuales
  startTime        String    // "09:00" formato HH:mm
  duration         Int       // minutos
  isRecurring      Boolean   @default(false)
  notes            String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  teacher        Teacher        @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  group          Group          @relation(fields: [groupId], references: [id], onDelete: Cascade)
  preparedLesson PreparedLesson @relation(fields: [preparedLessonId], references: [id], onDelete: Cascade)
}
```

**Step 2: Añadir relaciones a modelos existentes**

En `Teacher`:
```prisma
  scheduledClasses ScheduledClass[]
```

En `Group`:
```prisma
  scheduledClasses ScheduledClass[]
```

En `PreparedLesson`:
```prisma
  scheduledClasses ScheduledClass[]
```

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "schema: add ScheduledClass model for calendar"
```

---

### Task 3: Modificar modelo Exercise para usar Resource

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Actualizar modelo Exercise**

Reemplazar el modelo `Exercise` existente con:

```prisma
model Exercise {
  id               String @id @default(cuid())
  resourceId       String?  // nullable temporalmente para migración
  title            String?  // deprecated, mantener para migración
  url              String?  // deprecated, mantener para migración
  orderIndex       Int
  preparedLessonId String

  resource       Resource?       @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  preparedLesson PreparedLesson @relation(fields: [preparedLessonId], references: [id], onDelete: Cascade)
}
```

**Step 2: Commit**

```bash
git add prisma/schema.prisma
git commit -m "schema: update Exercise to reference Resource (migration prep)"
```

---

### Task 4: Ejecutar migración de Prisma

**Files:**
- Modify: `prisma/migrations/` (auto-generated)

**Step 1: Crear migración**

```bash
npx prisma migrate dev --name add_resources_and_scheduled_classes
```

**Step 2: Verificar que no hay errores**

Expected: Migration applied successfully

**Step 3: Generar cliente Prisma**

```bash
npx prisma generate
```

**Step 4: Commit**

```bash
git add prisma/
git commit -m "db: migrate - add resources and scheduled classes"
```

---

### Task 5: Crear script de migración de datos Exercise → Resource

**Files:**
- Create: `scripts/migrate-exercises-to-resources.ts`

**Step 1: Crear el script**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function inferResourceType(url: string): string {
  if (!url) return 'TEXT';
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('vimeo.com')) {
    return 'VIDEO';
  }
  if (lower.endsWith('.pdf')) {
    return 'PDF';
  }
  return 'URL';
}

async function main() {
  console.log('Starting migration of exercises to resources...');

  // Get all exercises with title and url that don't have a resourceId
  const exercises = await prisma.exercise.findMany({
    where: {
      resourceId: null,
      title: { not: null },
    },
    include: {
      preparedLesson: {
        select: { teacherId: true }
      }
    }
  });

  console.log(`Found ${exercises.length} exercises to migrate`);

  // Track created resources to avoid duplicates
  const resourceMap = new Map<string, string>(); // key: "teacherId-title-url" -> resourceId

  for (const exercise of exercises) {
    const key = `${exercise.preparedLesson.teacherId}-${exercise.title}-${exercise.url}`;

    let resourceId = resourceMap.get(key);

    if (!resourceId) {
      // Create new resource
      const resource = await prisma.resource.create({
        data: {
          title: exercise.title || 'Untitled',
          type: inferResourceType(exercise.url || ''),
          url: exercise.url,
          teacherId: exercise.preparedLesson.teacherId,
        }
      });
      resourceId = resource.id;
      resourceMap.set(key, resourceId);
      console.log(`Created resource: ${resource.title} (${resource.type})`);
    }

    // Update exercise with resourceId
    await prisma.exercise.update({
      where: { id: exercise.id },
      data: { resourceId }
    });
  }

  console.log(`Migration complete. Created ${resourceMap.size} resources.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Step 2: Añadir script a package.json**

En `package.json`, añadir en "scripts":

```json
"migrate:exercises": "npx tsx scripts/migrate-exercises-to-resources.ts"
```

**Step 3: Commit**

```bash
git add scripts/migrate-exercises-to-resources.ts package.json
git commit -m "scripts: add exercise to resource migration"
```

---

### Task 6: Ejecutar migración de datos (si hay datos existentes)

**Step 1: Ejecutar el script**

```bash
npm run migrate:exercises
```

**Step 2: Verificar en la base de datos**

```bash
npx prisma studio
```

Verificar que:
- Existen Resources creados
- Exercises tienen resourceId poblado

---

### Task 7: Instalar dependencias nuevas

**Files:**
- Modify: `package.json`

**Step 1: Instalar dnd-kit**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add dnd-kit for drag and drop"
```

---

### Task 8: Inicializar shadcn/ui

**Step 1: Inicializar shadcn**

```bash
npx shadcn@latest init
```

Responder a las preguntas:
- Style: Default
- Base color: Slate
- CSS variables: Yes

**Step 2: Verificar que se creó components.json**

**Step 3: Commit**

```bash
git add components.json tailwind.config.ts src/lib/utils.ts
git commit -m "setup: initialize shadcn/ui"
```

---

### Task 9: Instalar componentes shadcn/ui

**Step 1: Instalar componentes**

```bash
npx shadcn@latest add button dialog input select dropdown-menu toast badge tabs
```

**Step 2: Verificar que se crearon en src/components/ui/**

**Step 3: Commit**

```bash
git add src/components/ui/
git commit -m "ui: add shadcn components (button, dialog, input, select, dropdown, toast, badge, tabs)"
```

---

### Task 10: Crear archivo de variables CSS

**Files:**
- Create: `src/styles/_variables.css`

**Step 1: Crear el archivo**

```css
/* ===========================================
   DESIGN TOKENS - Classroom Focus Tracker
   Based on Stitch design system
   =========================================== */

:root {
  /* --- Colores Primarios --- */
  --color-primary: #137fec;
  --color-primary-hover: #1171d4;
  --color-primary-muted: rgba(19, 127, 236, 0.1);
  --color-primary-glow: rgba(19, 127, 236, 0.3);

  /* --- Superficies --- */
  --surface-base: #101922;
  --surface-raised: #1a242d;
  --surface-overlay: #283039;
  --surface-darker: #111418;
  --surface-card: #1c2127;
  --surface-hover: #252b33;

  /* --- Texto --- */
  --text-primary: #ffffff;
  --text-secondary: #9dabb9;
  --text-muted: #586370;

  /* --- Estados de Atención --- */
  --status-active: #137fec;
  --status-idle: #f59e0b;
  --status-distracted: #ef4444;
  --status-offline: #6b7280;
  --status-success: #10b981;

  /* --- Bordes --- */
  --border-default: #283039;
  --border-hover: #3e4a57;
  --border-active: var(--color-primary);

  /* --- Espaciado --- */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;

  /* --- Border Radius --- */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  /* --- Sombras --- */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.4);
  --shadow-glow-primary: 0 0 20px var(--color-primary-glow);
  --shadow-glow-red: 0 0 15px rgba(239, 68, 68, 0.3);

  /* --- Transiciones --- */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;

  /* --- Z-Index --- */
  --z-dropdown: 50;
  --z-modal: 100;
  --z-tooltip: 150;
}
```

**Step 2: Commit**

```bash
git add src/styles/_variables.css
git commit -m "styles: add CSS design tokens"
```

---

### Task 11: Crear archivo de placeholders CSS

**Files:**
- Create: `src/styles/_placeholders.css`

**Step 1: Crear el archivo**

```css
/* ===========================================
   PLACEHOLDERS - Clases base reutilizables
   =========================================== */

@layer components {
  /* --- Superficies --- */
  .surface-base {
    @apply bg-[var(--surface-base)] text-[var(--text-primary)];
  }

  .surface-card {
    @apply bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg;
  }

  .surface-card-interactive {
    @apply bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg
           hover:border-[var(--border-hover)] transition-all duration-200 cursor-pointer;
  }

  .surface-card-highlight {
    @apply bg-[var(--surface-raised)] border border-[var(--color-primary)] rounded-lg
           shadow-[var(--shadow-glow-primary)];
  }

  .surface-card-alert {
    @apply bg-red-500/5 border border-red-500/30 rounded-lg
           shadow-[var(--shadow-glow-red)];
  }

  /* --- Texto --- */
  .text-heading {
    @apply text-[var(--text-primary)] font-bold tracking-tight;
  }

  .text-heading-xl {
    @apply text-[var(--text-primary)] text-3xl md:text-4xl font-extrabold tracking-tight;
  }

  .text-body {
    @apply text-[var(--text-secondary)] font-normal;
  }

  .text-caption {
    @apply text-[var(--text-muted)] text-xs font-medium;
  }

  .text-label {
    @apply text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider;
  }

  /* --- Flexbox Utilities --- */
  .flex-center {
    @apply flex items-center justify-center;
  }

  .flex-between {
    @apply flex items-center justify-between;
  }

  .flex-stack {
    @apply flex flex-col gap-[var(--space-md)];
  }

  .flex-row-gap {
    @apply flex items-center gap-[var(--space-md)];
  }

  /* --- Interactivos --- */
  .interactive-base {
    @apply transition-all duration-200 cursor-pointer;
  }

  .interactive-hover {
    @apply transition-all duration-200 cursor-pointer hover:bg-[var(--surface-overlay)];
  }

  .focus-ring {
    @apply focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]
           focus:ring-offset-2 focus:ring-offset-[var(--surface-base)];
  }
}
```

**Step 2: Commit**

```bash
git add src/styles/_placeholders.css
git commit -m "styles: add placeholder classes"
```

---

### Task 12: Crear archivo de mixins CSS

**Files:**
- Create: `src/styles/_mixins.css`

**Step 1: Crear el archivo**

```css
/* ===========================================
   MIXINS - Composiciones de estilos
   =========================================== */

@layer components {
  /* --- Icon Containers --- */
  .icon-container-sm {
    @apply flex-center size-8 rounded-lg;
  }

  .icon-container-md {
    @apply flex-center size-10 rounded-lg;
  }

  .icon-container-lg {
    @apply flex-center size-12 rounded-xl;
  }

  .icon-primary {
    @apply bg-[var(--color-primary-muted)] text-[var(--color-primary)];
  }

  .icon-muted {
    @apply bg-[var(--surface-overlay)] text-[var(--text-secondary)];
  }

  /* --- Status Dots --- */
  .status-dot {
    @apply size-2 rounded-full;
  }

  .status-dot-active {
    @apply status-dot bg-[var(--status-active)] shadow-[0_0_8px_var(--status-active)];
  }

  .status-dot-idle {
    @apply status-dot bg-[var(--status-idle)];
  }

  .status-dot-distracted {
    @apply status-dot bg-[var(--status-distracted)] animate-pulse;
  }

  .status-dot-offline {
    @apply status-dot bg-[var(--status-offline)];
  }

  /* --- Status Badges --- */
  .badge-base {
    @apply inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide;
  }

  .badge-live {
    @apply badge-base bg-red-500 text-white animate-pulse;
  }

  .badge-active {
    @apply badge-base bg-[var(--color-primary-muted)] text-[var(--color-primary)]
           border border-[var(--color-primary)]/20;
  }

  .badge-idle {
    @apply badge-base bg-amber-500/10 text-amber-500 border border-amber-500/20;
  }

  .badge-distracted {
    @apply badge-base bg-red-500/10 text-red-400 border border-red-500/20;
  }

  .badge-offline {
    @apply badge-base bg-gray-500/10 text-gray-400 border border-gray-500/20;
  }

  .badge-success {
    @apply badge-base bg-green-500/10 text-green-400 border border-green-500/20;
  }

  /* --- Cards especializados --- */
  .card-lesson {
    @apply surface-card-interactive p-4 flex-stack gap-3 hover:shadow-md hover:-translate-y-0.5;
  }

  .card-student {
    @apply surface-card p-4 flex flex-col items-center gap-3;
  }

  .card-student-alert {
    @apply surface-card-alert p-4 flex flex-col items-center gap-3;
  }

  /* --- Inputs --- */
  .input-base {
    @apply w-full bg-[var(--surface-darker)] border border-[var(--border-default)]
           rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]
           placeholder:text-[var(--text-muted)]
           focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
           focus:outline-none transition-colors;
  }

  .input-with-icon {
    @apply input-base pl-10;
  }

  /* --- Scrollbar --- */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: var(--border-default) var(--surface-base);
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: var(--surface-base);
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--border-default);
    border-radius: 3px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--border-hover);
  }
}
```

**Step 2: Commit**

```bash
git add src/styles/_mixins.css
git commit -m "styles: add mixin classes"
```

---

### Task 13: Crear archivo de botones CSS

**Files:**
- Create: `src/styles/components/_buttons.css`

**Step 1: Crear directorio y archivo**

```bash
mkdir -p src/styles/components
```

```css
/* ===========================================
   BUTTONS
   =========================================== */

@layer components {
  .btn {
    @apply inline-flex items-center justify-center gap-2
           font-bold text-sm rounded-lg
           transition-all duration-200
           focus-ring disabled:opacity-50 disabled:cursor-not-allowed;
  }

  /* Tamaños */
  .btn-xs {
    @apply h-7 px-2 text-xs;
  }

  .btn-sm {
    @apply h-8 px-3 text-xs;
  }

  .btn-md {
    @apply h-10 px-4;
  }

  .btn-lg {
    @apply h-12 px-6;
  }

  /* Variantes */
  .btn-primary {
    @apply btn bg-[var(--color-primary)] text-white
           hover:bg-[var(--color-primary-hover)]
           shadow-lg shadow-blue-900/20;
  }

  .btn-secondary {
    @apply btn bg-[var(--surface-overlay)] text-white
           border border-[var(--border-default)]
           hover:bg-[var(--border-hover)];
  }

  .btn-danger {
    @apply btn bg-red-500/10 text-red-400
           border border-red-500/20
           hover:bg-red-500/20;
  }

  .btn-ghost {
    @apply btn bg-transparent text-[var(--text-secondary)]
           hover:bg-[var(--surface-overlay)] hover:text-white;
  }

  .btn-icon {
    @apply btn p-0 size-10;
  }

  .btn-icon-sm {
    @apply btn p-0 size-8;
  }
}
```

**Step 2: Commit**

```bash
git add src/styles/components/_buttons.css
git commit -m "styles: add button classes"
```

---

### Task 14: Crear archivo de formularios CSS

**Files:**
- Create: `src/styles/components/_forms.css`

**Step 1: Crear el archivo**

```css
/* ===========================================
   FORMS
   =========================================== */

@layer components {
  .form-group {
    @apply flex flex-col gap-1.5;
  }

  .form-label {
    @apply text-label;
  }

  .form-input {
    @apply input-base;
  }

  .form-input-icon-wrapper {
    @apply relative;
  }

  .form-input-icon {
    @apply absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)];
  }

  .form-select {
    @apply input-base appearance-none cursor-pointer pr-10;
  }

  .form-select-wrapper {
    @apply relative;
  }

  .form-select-icon {
    @apply absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none;
  }

  .form-textarea {
    @apply input-base resize-none min-h-[80px];
  }

  .form-checkbox {
    @apply size-4 rounded border-[var(--border-default)] bg-[var(--surface-darker)]
           text-[var(--color-primary)] focus:ring-[var(--color-primary)];
  }

  .form-error {
    @apply text-red-400 text-xs mt-1;
  }

  .form-hint {
    @apply text-[var(--text-muted)] text-xs mt-1;
  }
}
```

**Step 2: Commit**

```bash
git add src/styles/components/_forms.css
git commit -m "styles: add form classes"
```

---

### Task 15: Crear archivo de cards CSS

**Files:**
- Create: `src/styles/components/_cards.css`

**Step 1: Crear el archivo**

```css
/* ===========================================
   CARDS
   =========================================== */

@layer components {
  /* --- Session Card (Dashboard) --- */
  .card-session {
    @apply surface-card overflow-hidden flex flex-col sm:flex-row
           hover:border-[var(--color-primary)]/40 transition-all;
  }

  .card-session-image {
    @apply w-full sm:w-48 lg:w-56 h-48 sm:h-auto bg-cover bg-center relative shrink-0;
  }

  .card-session-content {
    @apply flex-1 p-5 flex flex-col justify-between;
  }

  /* --- Group Card (Dashboard) --- */
  .card-group {
    @apply surface-card-interactive p-4 flex-stack gap-3;
  }

  .card-group-image {
    @apply w-full aspect-video bg-[var(--surface-overlay)] rounded-lg bg-cover bg-center relative;
  }

  /* --- Resource Card (Library) --- */
  .card-resource {
    @apply surface-card-interactive flex flex-col h-64 overflow-hidden
           hover:shadow-lg hover:-translate-y-1;
  }

  .card-resource-preview {
    @apply h-32 w-full flex-center bg-[var(--surface-hover)] rounded-t-lg relative;
  }

  .card-resource-content {
    @apply p-4 flex flex-col flex-1;
  }

  /* --- Student Card (Session) --- */
  .card-student-base {
    @apply relative rounded-xl p-4 border transition-all;
  }

  .card-student-active {
    @apply card-student-base bg-[var(--surface-overlay)] border-transparent
           hover:border-[var(--border-hover)];
  }

  .card-student-distracted {
    @apply card-student-base bg-[#1c2026] border-red-500/30
           hover:border-red-500/60 shadow-[var(--shadow-glow-red)];
  }

  .card-student-idle {
    @apply card-student-base bg-[var(--surface-overlay)] border-transparent
           hover:border-amber-500/30;
  }

  .card-student-offline {
    @apply card-student-base bg-[#161a1f] border-transparent opacity-70
           hover:opacity-100;
  }

  /* --- Stats Card --- */
  .card-stats {
    @apply surface-card p-5 flex-stack gap-1;
  }

  .card-stats-alert {
    @apply border-red-900/30 bg-red-900/10;
  }
}
```

**Step 2: Commit**

```bash
git add src/styles/components/_cards.css
git commit -m "styles: add card classes"
```

---

### Task 16: Crear archivo de calendario CSS

**Files:**
- Create: `src/styles/components/_calendar.css`

**Step 1: Crear el archivo**

```css
/* ===========================================
   CALENDAR
   =========================================== */

@layer components {
  /* --- Grid Layout --- */
  .calendar-grid {
    @apply grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr] auto-rows-[80px] relative;
  }

  .calendar-header {
    @apply grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr] sticky top-0 z-10
           bg-[var(--surface-base)] border-b border-[var(--border-default)] shadow-sm;
  }

  .calendar-day-header {
    @apply p-4 text-center border-r border-[var(--border-default)];
  }

  .calendar-day-header-current {
    @apply calendar-day-header bg-[var(--color-primary)]/5;
  }

  .calendar-time-label {
    @apply text-[var(--text-muted)] text-xs font-medium text-right pr-3 pt-2 -mt-2.5;
  }

  .calendar-cell {
    @apply border-b border-[var(--border-default)]/30 p-1 relative
           hover:bg-white/[0.02] transition-colors;
  }

  .calendar-cell-current {
    @apply calendar-cell bg-[var(--color-primary)]/5;
  }

  /* --- Time Indicator --- */
  .calendar-time-indicator {
    @apply absolute left-0 right-0 h-[2px] bg-red-500 z-30 pointer-events-none flex items-center;
  }

  .calendar-time-indicator-dot {
    @apply size-2 bg-red-500 rounded-full -ml-1 ring-2 ring-[var(--surface-base)];
  }

  /* --- Scheduled Class Card --- */
  .calendar-class-card {
    @apply absolute left-2 right-2 z-20 rounded p-3 shadow-lg cursor-pointer
           transition-colors flex flex-col gap-1 ring-1 ring-inset ring-white/5;
  }

  .calendar-class-card:hover {
    @apply brightness-110;
  }

  /* --- Lesson Bank --- */
  .lesson-bank-item {
    @apply bg-[var(--surface-base)] p-3 rounded-lg border border-[var(--border-default)]
           hover:border-[var(--color-primary)]/50 cursor-grab active:cursor-grabbing
           transition-all shadow-sm hover:shadow-lg hover:shadow-[var(--color-primary)]/5;
  }

  .lesson-bank-item-dragging {
    @apply opacity-50 scale-105;
  }

  /* --- Drop Zone --- */
  .calendar-drop-zone {
    @apply absolute inset-0 border-2 border-dashed border-[var(--color-primary)]/50
           bg-[var(--color-primary)]/10 rounded z-10;
  }
}
```

**Step 2: Commit**

```bash
git add src/styles/components/_calendar.css
git commit -m "styles: add calendar classes"
```

---

### Task 17: Crear archivo de layouts CSS

**Files:**
- Create: `src/styles/layouts/_sidebar.css`

**Step 1: Crear directorio y archivo**

```bash
mkdir -p src/styles/layouts
```

```css
/* ===========================================
   SIDEBAR LAYOUT
   =========================================== */

@layer components {
  .sidebar {
    @apply hidden md:flex flex-col w-72 h-full
           bg-[#111418] border-r border-[var(--border-default)]
           px-4 py-6 justify-between shrink-0;
  }

  .sidebar-logo {
    @apply flex items-center gap-3 px-2;
  }

  .sidebar-logo-icon {
    @apply flex-center size-10 rounded-xl
           bg-gradient-to-br from-[var(--color-primary)] to-blue-600
           text-white shadow-lg shadow-[var(--color-primary)]/20;
  }

  .sidebar-nav {
    @apply flex flex-col gap-2;
  }

  .sidebar-nav-item {
    @apply flex items-center gap-3 px-4 py-3 rounded-lg
           text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-white
           transition-colors;
  }

  .sidebar-nav-item-active {
    @apply flex items-center gap-3 px-4 py-3 rounded-lg
           bg-[var(--color-primary)]/10 text-[var(--color-primary)]
           border border-[var(--color-primary)]/20;
  }

  .sidebar-nav-icon {
    @apply text-2xl;
  }

  .sidebar-nav-label {
    @apply text-sm font-medium;
  }

  .sidebar-nav-label-active {
    @apply text-sm font-bold;
  }

  /* --- Header --- */
  .header {
    @apply flex items-center justify-between whitespace-nowrap
           border-b border-[var(--border-default)] bg-[var(--surface-base)]
           px-6 py-3 sticky top-0 z-50;
  }

  .header-mobile {
    @apply md:hidden flex items-center justify-between p-4
           bg-[#111418] border-b border-[var(--border-default)];
  }
}
```

**Step 2: Commit**

```bash
git add src/styles/layouts/_sidebar.css
git commit -m "styles: add sidebar layout classes"
```

---

### Task 18: Actualizar globals.css con imports

**Files:**
- Modify: `src/app/globals.css` (o `src/styles/globals.css`)

**Step 1: Reemplazar contenido de globals.css**

Primero, verificar la ubicación actual del archivo global de estilos, luego reemplazar con:

```css
@import 'tailwindcss';

/* === Design System === */
@import '../styles/_variables.css';
@import '../styles/_placeholders.css';
@import '../styles/_mixins.css';

/* === Components === */
@import '../styles/components/_buttons.css';
@import '../styles/components/_forms.css';
@import '../styles/components/_cards.css';
@import '../styles/components/_calendar.css';

/* === Layouts === */
@import '../styles/layouts/_sidebar.css';

/* === Fonts === */
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Noto+Sans:wght@400;500;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

/* === Base Styles === */
@layer base {
  * {
    @apply border-[var(--border-default)];
  }

  body {
    @apply surface-base font-display antialiased;
  }

  h1, h2, h3, h4, h5, h6 {
    @apply text-heading;
  }
}

/* === Material Symbols Config === */
.material-symbols-outlined {
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
}

.material-symbols-outlined.filled {
  font-variation-settings:
    'FILL' 1,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
}

/* === Animations === */
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 15px var(--color-primary-glow);
  }
  50% {
    box-shadow: 0 0 25px var(--color-primary-glow);
  }
}

.animate-pulse-glow {
  animation: pulse-glow 3s infinite ease-in-out;
}
```

**Step 2: Ajustar paths si es necesario**

Si el archivo está en `src/app/globals.css`, ajustar los imports a rutas relativas correctas.

**Step 3: Commit**

```bash
git add src/app/globals.css src/styles/
git commit -m "styles: setup complete design system with imports"
```

---

### Task 19: Actualizar tailwind.config.ts

**Files:**
- Modify: `tailwind.config.ts`

**Step 1: Actualizar configuración**

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#137fec",
        "background-dark": "#101922",
        "background-light": "#f6f7f8",
        "surface-dark": "#1a242d",
        "surface-darker": "#111418",
        "border-dark": "#283039",
        "text-secondary": "#9dabb9",
        "status-active": "#137fec",
        "status-idle": "#f59e0b",
        "status-distracted": "#ef4444",
        "status-offline": "#6b7280",
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        body: ["Noto Sans", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

**Step 2: Instalar plugin de animaciones si no existe**

```bash
npm install tailwindcss-animate
```

**Step 3: Commit**

```bash
git add tailwind.config.ts package.json package-lock.json
git commit -m "config: update tailwind with design system"
```

---

## Fase 2: Componentes de Layout

---

### Task 20: Crear componente Sidebar

**Files:**
- Create: `src/components/layout/Sidebar.tsx`

**Step 1: Crear directorio y archivo**

```bash
mkdir -p src/components/layout
```

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/dashboard/lessons", label: "Biblioteca", icon: "local_library" },
  { href: "/dashboard/calendar", label: "Horario", icon: "calendar_month" },
  { href: "/dashboard/reports", label: "Reportes", icon: "bar_chart" },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="sidebar">
      <div className="flex flex-col gap-8">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <span className="material-symbols-outlined text-2xl">
              center_focus_strong
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-white text-base font-bold leading-tight tracking-tight">
              Classroom
            </span>
            <span className="text-primary text-base font-bold leading-tight tracking-tight">
              Focus Tracker
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive(item.href)
                  ? "sidebar-nav-item-active"
                  : "sidebar-nav-item"
              }
            >
              <span
                className={`material-symbols-outlined sidebar-nav-icon ${
                  isActive(item.href) ? "filled" : ""
                }`}
              >
                {item.icon}
              </span>
              <span
                className={
                  isActive(item.href)
                    ? "sidebar-nav-label-active"
                    : "sidebar-nav-label"
                }
              >
                {item.label}
              </span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="px-4 py-2">
        <p className="text-[10px] text-[var(--text-muted)] opacity-50 uppercase tracking-widest">
          Version 2.0.0
        </p>
      </div>
    </aside>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "components: add Sidebar layout component"
```

---

### Task 21: Crear componente Header

**Files:**
- Create: `src/components/layout/Header.tsx`

**Step 1: Crear el archivo**

```tsx
"use client";

import { useSession } from "next-auth/react";
import { SignOutButton } from "@/components/SignOutButton";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="header">
      <div className="flex items-center gap-4">
        {/* Mobile Logo */}
        <div className="md:hidden flex items-center gap-2">
          <div className="flex-center size-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 text-white">
            <span className="material-symbols-outlined text-lg">
              center_focus_strong
            </span>
          </div>
          <span className="text-white font-bold text-sm">CFT</span>
        </div>

        {/* Title (desktop) */}
        {title && (
          <div className="hidden md:block">
            <h2 className="text-white text-lg font-bold">{title}</h2>
            {subtitle && (
              <p className="text-[var(--text-secondary)] text-xs">{subtitle}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* User info */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-white text-sm font-medium">
              {session?.user?.email}
            </span>
          </div>
          <div className="size-9 rounded-full bg-[var(--surface-overlay)] flex-center text-[var(--text-secondary)]">
            <span className="material-symbols-outlined">person</span>
          </div>
        </div>

        <SignOutButton />
      </div>
    </header>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "components: add Header layout component"
```

---

### Task 22: Crear componente PageContainer

**Files:**
- Create: `src/components/layout/PageContainer.tsx`

**Step 1: Crear el archivo**

```tsx
interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <main className={`flex-1 overflow-y-auto p-4 md:p-8 ${className}`}>
      <div className="mx-auto max-w-[1400px] flex flex-col gap-8">
        {children}
      </div>
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/layout/PageContainer.tsx
git commit -m "components: add PageContainer layout component"
```

---

### Task 23: Crear index de exports para layout

**Files:**
- Create: `src/components/layout/index.ts`

**Step 1: Crear el archivo**

```typescript
export { Sidebar } from "./Sidebar";
export { Header } from "./Header";
export { PageContainer } from "./PageContainer";
```

**Step 2: Commit**

```bash
git add src/components/layout/index.ts
git commit -m "components: add layout barrel export"
```

---

### Task 24: Actualizar Dashboard Layout

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

**Step 1: Leer el layout actual**

Verificar la estructura actual del layout.

**Step 2: Actualizar con nuevo diseño**

```tsx
import { Sidebar, Header } from "@/components/layout";
import { Providers } from "@/components/Providers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex h-screen w-full surface-base">
        <Sidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <Header />
          {children}
        </div>
      </div>
    </Providers>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/(dashboard)/layout.tsx
git commit -m "layout: update dashboard layout with new design"
```

---

## Fase 3: Componentes Comunes

---

### Task 25: Crear componente StatusBadge

**Files:**
- Create: `src/components/common/StatusBadge.tsx`

**Step 1: Crear directorio y archivo**

```bash
mkdir -p src/components/common
```

```tsx
type StatusType = "active" | "idle" | "distracted" | "offline" | "live";

interface StatusBadgeProps {
  status: StatusType;
  showDot?: boolean;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  active: { label: "ACTIVO", className: "badge-active" },
  idle: { label: "INACTIVO", className: "badge-idle" },
  distracted: { label: "DISTRAÍDO", className: "badge-distracted" },
  offline: { label: "OFFLINE", className: "badge-offline" },
  live: { label: "LIVE", className: "badge-live" },
};

export function StatusBadge({
  status,
  showDot = true,
  className = "",
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={`${config.className} ${className}`}>
      {showDot && (
        <span
          className={`status-dot-${status === "live" ? "distracted" : status}`}
        />
      )}
      {config.label}
    </span>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/common/StatusBadge.tsx
git commit -m "components: add StatusBadge component"
```

---

### Task 26: Crear componente StatusDot

**Files:**
- Create: `src/components/common/StatusDot.tsx`

**Step 1: Crear el archivo**

```tsx
type StatusType = "active" | "idle" | "distracted" | "offline";

interface StatusDotProps {
  status: StatusType;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "size-1.5",
  md: "size-2",
  lg: "size-3",
};

export function StatusDot({
  status,
  size = "md",
  className = "",
}: StatusDotProps) {
  return (
    <span
      className={`status-dot-${status} ${sizeClasses[size]} ${className}`}
    />
  );
}
```

**Step 2: Commit**

```bash
git add src/components/common/StatusDot.tsx
git commit -m "components: add StatusDot component"
```

---

### Task 27: Crear componente ResourceIcon

**Files:**
- Create: `src/components/common/ResourceIcon.tsx`

**Step 1: Crear el archivo**

```tsx
type ResourceType = "VIDEO" | "PDF" | "URL" | "TEXT";

interface ResourceIconProps {
  type: ResourceType;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const iconConfig: Record<ResourceType, { icon: string; color: string }> = {
  VIDEO: { icon: "smart_display", color: "text-red-400" },
  PDF: { icon: "picture_as_pdf", color: "text-purple-400" },
  URL: { icon: "link", color: "text-blue-400" },
  TEXT: { icon: "article", color: "text-gray-400" },
};

const sizeClasses = {
  sm: "text-[16px]",
  md: "text-[20px]",
  lg: "text-[24px]",
};

export function ResourceIcon({
  type,
  size = "md",
  className = "",
}: ResourceIconProps) {
  const config = iconConfig[type];

  return (
    <span
      className={`material-symbols-outlined ${config.color} ${sizeClasses[size]} ${className}`}
    >
      {config.icon}
    </span>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/common/ResourceIcon.tsx
git commit -m "components: add ResourceIcon component"
```

---

### Task 28: Crear componente Avatar

**Files:**
- Create: `src/components/common/Avatar.tsx`

**Step 1: Crear el archivo**

```tsx
interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  status?: "active" | "idle" | "distracted" | "offline";
  className?: string;
}

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-20 text-2xl",
};

const statusRingClasses = {
  active: "ring-2 ring-[var(--status-active)]",
  idle: "ring-2 ring-[var(--status-idle)]",
  distracted: "ring-2 ring-[var(--status-distracted)] animate-pulse",
  offline: "ring-2 ring-[var(--status-offline)]",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ name, size = "md", status, className = "" }: AvatarProps) {
  const initials = getInitials(name);

  return (
    <div
      className={`
        flex-center rounded-full bg-[var(--surface-overlay)] text-white font-bold
        ${sizeClasses[size]}
        ${status ? statusRingClasses[status] : ""}
        ${className}
      `}
    >
      {initials}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/common/Avatar.tsx
git commit -m "components: add Avatar component"
```

---

### Task 29: Crear componente EmptyState

**Files:**
- Create: `src/components/common/EmptyState.tsx`

**Step 1: Crear el archivo**

```tsx
interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="icon-container-lg icon-muted mb-4">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>
      <h3 className="text-heading text-lg mb-2">{title}</h3>
      {description && (
        <p className="text-body text-sm max-w-md mb-6">{description}</p>
      )}
      {action && (
        <button onClick={action.onClick} className="btn-primary btn-md">
          {action.label}
        </button>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/common/EmptyState.tsx
git commit -m "components: add EmptyState component"
```

---

### Task 30: Crear index de exports para common

**Files:**
- Create: `src/components/common/index.ts`

**Step 1: Crear el archivo**

```typescript
export { StatusBadge } from "./StatusBadge";
export { StatusDot } from "./StatusDot";
export { ResourceIcon } from "./ResourceIcon";
export { Avatar } from "./Avatar";
export { EmptyState } from "./EmptyState";
```

**Step 2: Commit**

```bash
git add src/components/common/index.ts
git commit -m "components: add common barrel export"
```

---

## Fase 4: APIs de Recursos

---

### Task 31: Crear API GET/POST /api/resources

**Files:**
- Create: `src/app/api/resources/route.ts`

**Step 1: Crear directorio y archivo**

```bash
mkdir -p src/app/api/resources
```

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/resources - List all resources for the teacher
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resources = await prisma.resource.findMany({
      where: { teacherId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(resources);
  } catch (error) {
    console.error("Error fetching resources:", error);
    return NextResponse.json(
      { error: "Failed to fetch resources" },
      { status: 500 }
    );
  }
}

// POST /api/resources - Create a new resource
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, type, url, content, duration } = body;

    if (!title || !type) {
      return NextResponse.json(
        { error: "Title and type are required" },
        { status: 400 }
      );
    }

    const validTypes = ["VIDEO", "PDF", "URL", "TEXT"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid resource type" },
        { status: 400 }
      );
    }

    const resource = await prisma.resource.create({
      data: {
        title,
        type,
        url: url || null,
        content: content || null,
        duration: duration || null,
        teacherId: session.user.id,
      },
    });

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    console.error("Error creating resource:", error);
    return NextResponse.json(
      { error: "Failed to create resource" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/resources/route.ts
git commit -m "api: add GET/POST /api/resources endpoints"
```

---

### Task 32: Crear API GET/PUT/DELETE /api/resources/[id]

**Files:**
- Create: `src/app/api/resources/[id]/route.ts`

**Step 1: Crear directorio y archivo**

```bash
mkdir -p src/app/api/resources/[id]
```

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/resources/[id]
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const resource = await prisma.resource.findFirst({
      where: {
        id,
        teacherId: session.user.id,
      },
    });

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    return NextResponse.json(resource);
  } catch (error) {
    console.error("Error fetching resource:", error);
    return NextResponse.json(
      { error: "Failed to fetch resource" },
      { status: 500 }
    );
  }
}

// PUT /api/resources/[id]
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, type, url, content, duration } = body;

    // Verify ownership
    const existing = await prisma.resource.findFirst({
      where: { id, teacherId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const resource = await prisma.resource.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        type: type ?? existing.type,
        url: url !== undefined ? url : existing.url,
        content: content !== undefined ? content : existing.content,
        duration: duration !== undefined ? duration : existing.duration,
      },
    });

    return NextResponse.json(resource);
  } catch (error) {
    console.error("Error updating resource:", error);
    return NextResponse.json(
      { error: "Failed to update resource" },
      { status: 500 }
    );
  }
}

// DELETE /api/resources/[id]
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.resource.findFirst({
      where: { id, teacherId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    await prisma.resource.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting resource:", error);
    return NextResponse.json(
      { error: "Failed to delete resource" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/resources/[id]/route.ts
git commit -m "api: add GET/PUT/DELETE /api/resources/[id] endpoints"
```

---

## Fase 5: APIs de Calendario

---

### Task 33: Crear API GET/POST /api/scheduled-classes

**Files:**
- Create: `src/app/api/scheduled-classes/route.ts`

**Step 1: Crear directorio y archivo**

```bash
mkdir -p src/app/api/scheduled-classes
```

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/scheduled-classes
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get("weekStart");
    const weekEnd = searchParams.get("weekEnd");

    const scheduledClasses = await prisma.scheduledClass.findMany({
      where: {
        teacherId: session.user.id,
        OR: [
          // Recurring classes (any week)
          { isRecurring: true },
          // Specific date classes within range
          {
            isRecurring: false,
            specificDate: {
              gte: weekStart ? new Date(weekStart) : undefined,
              lte: weekEnd ? new Date(weekEnd) : undefined,
            },
          },
        ],
      },
      include: {
        group: { select: { id: true, name: true } },
        preparedLesson: { select: { id: true, title: true } },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(scheduledClasses);
  } catch (error) {
    console.error("Error fetching scheduled classes:", error);
    return NextResponse.json(
      { error: "Failed to fetch scheduled classes" },
      { status: 500 }
    );
  }
}

// POST /api/scheduled-classes
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      groupId,
      preparedLessonId,
      dayOfWeek,
      specificDate,
      startTime,
      duration,
      isRecurring,
      notes,
    } = body;

    // Validations
    if (!groupId || !preparedLessonId || !startTime || !duration) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (isRecurring && dayOfWeek === undefined) {
      return NextResponse.json(
        { error: "dayOfWeek required for recurring classes" },
        { status: 400 }
      );
    }

    if (!isRecurring && !specificDate) {
      return NextResponse.json(
        { error: "specificDate required for non-recurring classes" },
        { status: 400 }
      );
    }

    // Verify ownership of group and lesson
    const [group, lesson] = await Promise.all([
      prisma.group.findFirst({
        where: { id: groupId, teacherId: session.user.id },
      }),
      prisma.preparedLesson.findFirst({
        where: { id: preparedLessonId, teacherId: session.user.id },
      }),
    ]);

    if (!group || !lesson) {
      return NextResponse.json(
        { error: "Group or lesson not found" },
        { status: 404 }
      );
    }

    const scheduledClass = await prisma.scheduledClass.create({
      data: {
        teacherId: session.user.id,
        groupId,
        preparedLessonId,
        dayOfWeek: isRecurring ? dayOfWeek : null,
        specificDate: !isRecurring ? new Date(specificDate) : null,
        startTime,
        duration,
        isRecurring: isRecurring ?? false,
        notes: notes || null,
      },
      include: {
        group: { select: { id: true, name: true } },
        preparedLesson: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(scheduledClass, { status: 201 });
  } catch (error) {
    console.error("Error creating scheduled class:", error);
    return NextResponse.json(
      { error: "Failed to create scheduled class" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/scheduled-classes/route.ts
git commit -m "api: add GET/POST /api/scheduled-classes endpoints"
```

---

### Task 34: Crear API PUT/DELETE /api/scheduled-classes/[id]

**Files:**
- Create: `src/app/api/scheduled-classes/[id]/route.ts`

**Step 1: Crear directorio y archivo**

```bash
mkdir -p src/app/api/scheduled-classes/[id]
```

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/scheduled-classes/[id]
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const existing = await prisma.scheduledClass.findFirst({
      where: { id, teacherId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Scheduled class not found" },
        { status: 404 }
      );
    }

    const scheduledClass = await prisma.scheduledClass.update({
      where: { id },
      data: {
        groupId: body.groupId ?? existing.groupId,
        preparedLessonId: body.preparedLessonId ?? existing.preparedLessonId,
        dayOfWeek: body.dayOfWeek !== undefined ? body.dayOfWeek : existing.dayOfWeek,
        specificDate: body.specificDate
          ? new Date(body.specificDate)
          : existing.specificDate,
        startTime: body.startTime ?? existing.startTime,
        duration: body.duration ?? existing.duration,
        isRecurring: body.isRecurring ?? existing.isRecurring,
        notes: body.notes !== undefined ? body.notes : existing.notes,
      },
      include: {
        group: { select: { id: true, name: true } },
        preparedLesson: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(scheduledClass);
  } catch (error) {
    console.error("Error updating scheduled class:", error);
    return NextResponse.json(
      { error: "Failed to update scheduled class" },
      { status: 500 }
    );
  }
}

// DELETE /api/scheduled-classes/[id]
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.scheduledClass.findFirst({
      where: { id, teacherId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Scheduled class not found" },
        { status: 404 }
      );
    }

    await prisma.scheduledClass.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting scheduled class:", error);
    return NextResponse.json(
      { error: "Failed to delete scheduled class" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/scheduled-classes/[id]/route.ts
git commit -m "api: add PUT/DELETE /api/scheduled-classes/[id] endpoints"
```

---

### Task 35: Crear API POST /api/scheduled-classes/[id]/start

**Files:**
- Create: `src/app/api/scheduled-classes/[id]/start/route.ts`

**Step 1: Crear directorio y archivo**

```bash
mkdir -p src/app/api/scheduled-classes/[id]/start
```

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function generateSessionPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let password = "";
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// POST /api/scheduled-classes/[id]/start - Start a session from scheduled class
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the scheduled class
    const scheduledClass = await prisma.scheduledClass.findFirst({
      where: { id, teacherId: session.user.id },
    });

    if (!scheduledClass) {
      return NextResponse.json(
        { error: "Scheduled class not found" },
        { status: 404 }
      );
    }

    // Check if there's already an active session for this group
    const existingSession = await prisma.session.findFirst({
      where: {
        groupId: scheduledClass.groupId,
        isActive: true,
      },
    });

    if (existingSession) {
      return NextResponse.json(
        { error: "There is already an active session for this group" },
        { status: 409 }
      );
    }

    // Create the session
    const newSession = await prisma.session.create({
      data: {
        password: generateSessionPassword(),
        teacherId: session.user.id,
        groupId: scheduledClass.groupId,
        preparedLessonId: scheduledClass.preparedLessonId,
        isActive: true,
      },
      include: {
        group: { select: { name: true } },
        preparedLesson: { select: { title: true } },
      },
    });

    return NextResponse.json({
      sessionId: newSession.id,
      password: newSession.password,
      group: newSession.group.name,
      lesson: newSession.preparedLesson.title,
    });
  } catch (error) {
    console.error("Error starting session:", error);
    return NextResponse.json(
      { error: "Failed to start session" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/scheduled-classes/[id]/start/route.ts
git commit -m "api: add POST /api/scheduled-classes/[id]/start endpoint"
```

---

## Fase 6: Páginas (continuará en siguiente sesión)

Las siguientes tareas cubren la implementación de las páginas principales:

- Task 36-40: Página de Login unificado
- Task 41-45: Dashboard rediseñado
- Task 46-55: Página del Calendario con drag & drop
- Task 56-65: Biblioteca de Recursos y Editor de Lección
- Task 66-75: Sesión en Vivo (profesor y estudiante)
- Task 76-80: Detalle de Grupo

---

## Verificación Final

Después de completar todas las tareas:

1. **Ejecutar build**
   ```bash
   npm run build
   ```

2. **Ejecutar tests** (si existen)
   ```bash
   npm test
   ```

3. **Verificar en navegador**
   - Login funciona para ambos roles
   - Dashboard muestra nuevo diseño
   - Calendario permite drag & drop
   - Sesiones funcionan correctamente

4. **Commit final**
   ```bash
   git add .
   git commit -m "feat: complete redesign with calendar system"
   ```

---

## Notas Importantes

- **Siempre verificar imports** al crear nuevos componentes
- **Verificar que Prisma Client esté regenerado** después de cambios al schema
- **Probar en móvil** - el diseño debe ser responsive
- **Mantener la funcionalidad existente** mientras se rediseña
