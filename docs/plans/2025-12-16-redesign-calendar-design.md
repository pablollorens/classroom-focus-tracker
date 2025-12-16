# Classroom Focus Tracker - Rediseño Completo + Calendario

**Fecha:** 2025-12-16
**Estado:** Aprobado
**Alcance:** Rediseño visual total + Sistema de calendario para programar clases

---

## Resumen Ejecutivo

Rediseño completo de la aplicación Classroom Focus Tracker adoptando el sistema de diseño de Stitch, más la adición de un nuevo sistema de calendario para programar clases con anticipación.

### Decisiones Clave

| Aspecto | Decisión |
|---------|----------|
| Alcance | Rediseño total + calendario nuevo |
| Calendario | Híbrido: programa clases, profesor activa manualmente |
| Programación | Horarios recurrentes + eventos puntuales |
| Implementación | Todo junto en una rama |
| Sistema de diseño | Completo de Stitch (Manrope, colores, Material Symbols) |
| Recursos | Biblioteca compartida (modelo Resource separado) |

---

## 1. Modelo de Datos

### 1.1 Nuevos Modelos

#### Resource (Biblioteca compartida)

```prisma
model Resource {
  id          String   @id @default(cuid())
  title       String
  type        String   // VIDEO, PDF, URL, TEXT
  url         String?  // null para TEXT
  content     String?  // contenido para TEXT, null para otros
  duration    Int?     // minutos estimados
  teacherId   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  teacher   Teacher    @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  exercises Exercise[]
}
```

#### ScheduledClass (Calendario)

```prisma
model ScheduledClass {
  id               String    @id @default(cuid())
  teacherId        String
  groupId          String
  preparedLessonId String
  dayOfWeek        Int?      // 0-6 para recurrentes (0=Domingo), null para puntuales
  specificDate     DateTime? // fecha específica para puntuales, null para recurrentes
  startTime        String    // "09:00" formato HH:mm
  duration         Int       // minutos
  isRecurring      Boolean   @default(false)
  notes            String?   // notas opcionales para la clase
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  teacher        Teacher        @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  group          Group          @relation(fields: [groupId], references: [id], onDelete: Cascade)
  preparedLesson PreparedLesson @relation(fields: [preparedLessonId], references: [id], onDelete: Cascade)
}
```

### 1.2 Modelos Modificados

#### Exercise (ahora referencia Resource)

```prisma
model Exercise {
  id               String @id @default(cuid())
  resourceId       String
  orderIndex       Int
  preparedLessonId String

  resource       Resource       @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  preparedLesson PreparedLesson @relation(fields: [preparedLessonId], references: [id], onDelete: Cascade)
}
```

**Nota:** Eliminar campos `title` y `url` del modelo Exercise existente.

### 1.3 Relaciones a añadir

```prisma
// En Teacher
model Teacher {
  // ... campos existentes
  resources        Resource[]
  scheduledClasses ScheduledClass[]
}

// En Group
model Group {
  // ... campos existentes
  scheduledClasses ScheduledClass[]
}

// En PreparedLesson
model PreparedLesson {
  // ... campos existentes
  scheduledClasses ScheduledClass[]
}
```

---

## 2. Estructura de Rutas

```
/ (marketing)
├── /                          → Landing/Login unificado con selector de rol
├── /login                     → Redirect a / (deprecated)
└── /student/login             → Redirect a / (deprecated)

/dashboard (profesor autenticado)
├── /dashboard                 → Dashboard Principal
├── /dashboard/calendar        → [NUEVO] Programador de Clases
├── /dashboard/groups          → Lista de grupos (si se necesita)
├── /dashboard/groups/[id]     → Detalle de Grupo
├── /dashboard/groups/[id]/students/[studentId] → Stats estudiante
├── /dashboard/lessons         → Biblioteca de Recursos + Lecciones
├── /dashboard/lessons/[id]    → Editor de Lección
└── /dashboard/sessions/[id]   → Sesión en Vivo (profesor)

/class (estudiante en sesión)
└── /class/session             → Vista Estudiante en Sesión
```

### Navegación Sidebar

1. **Dashboard** (`/dashboard`) - Vista general con sesiones activas
2. **Biblioteca** (`/dashboard/lessons`) - Recursos y lecciones
3. **Horario** (`/dashboard/calendar`) - Calendario
4. **Reportes** (futuro, placeholder)

---

## 3. Sistema de Diseño

### 3.1 Tokens de Color

```css
:root {
  /* Colores primarios */
  --color-primary: #137fec;
  --color-primary-hover: #1171d4;
  --color-primary-muted: rgba(19, 127, 236, 0.1);

  /* Superficies */
  --surface-base: #101922;
  --surface-raised: #1a242d;
  --surface-overlay: #283039;
  --surface-darker: #111418;

  /* Texto */
  --text-primary: #ffffff;
  --text-secondary: #9dabb9;
  --text-muted: #586370;

  /* Estados de atención */
  --status-active: #137fec;
  --status-idle: #f59e0b;
  --status-distracted: #ef4444;
  --status-offline: #6b7280;

  /* Bordes */
  --border-default: #283039;
  --border-hover: #3e4a57;

  /* Espaciado */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;

  /* Radios */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  /* Sombras */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-glow-primary: 0 0 20px rgba(19, 127, 236, 0.3);
}
```

### 3.2 Tipografía

- **Display:** Manrope (headings, labels, UI)
- **Body:** Noto Sans (párrafos, contenido largo)

```css
fontFamily: {
  display: ["Manrope", "sans-serif"],
  body: ["Noto Sans", "sans-serif"],
}
```

### 3.3 Iconos

Material Symbols Outlined (Google Fonts)

```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
```

### 3.4 Estructura de Archivos de Estilos

```
src/styles/
├── globals.css              # Imports y reset
├── _variables.css           # CSS custom properties (tokens)
├── _placeholders.css        # Clases base reutilizables (@layer)
├── _mixins.css              # Composiciones de estilos
├── components/
│   ├── _buttons.css
│   ├── _cards.css
│   ├── _forms.css
│   ├── _badges.css
│   ├── _calendar.css
│   └── _status.css
└── layouts/
    ├── _sidebar.css
    └── _grid.css
```

### 3.5 Clases Reutilizables (DRY)

#### Placeholders

```css
/* Superficies */
.surface-base { }
.surface-card { }
.surface-card-interactive { }
.surface-card-highlight { }

/* Texto */
.text-heading { }
.text-body { }
.text-caption { }
.text-label { }

/* Flexbox */
.flex-center { }
.flex-between { }
.flex-stack { }

/* Interactivos */
.interactive-base { }
.interactive-hover { }
.focus-ring { }
```

#### Mixins/Componentes

```css
/* Iconos */
.icon-container-sm { }
.icon-container-md { }
.icon-container-lg { }
.icon-primary { }
.icon-muted { }

/* Status */
.status-dot { }
.status-dot-active { }
.status-dot-idle { }
.status-dot-distracted { }
.status-dot-offline { }

/* Badges */
.badge-base { }
.badge-live { }
.badge-active { }
.badge-idle { }
.badge-distracted { }

/* Botones */
.btn { }
.btn-sm { }
.btn-md { }
.btn-lg { }
.btn-primary { }
.btn-secondary { }
.btn-danger { }
.btn-ghost { }

/* Cards */
.card-lesson { }
.card-student { }
.card-student-alert { }

/* Inputs */
.input-base { }
.input-with-icon { }
```

---

## 4. Estructura de Componentes

```
src/components/
├── ui/                      # shadcn/ui (auto-generados)
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── dropdown-menu.tsx
│   ├── toast.tsx
│   ├── badge.tsx
│   └── tabs.tsx
├── layout/
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── PageContainer.tsx
│   └── MobileNav.tsx
├── dashboard/
│   ├── LiveSessionCard.tsx
│   ├── GroupCard.tsx
│   ├── StatsCard.tsx
│   └── WelcomeBanner.tsx
├── calendar/
│   ├── CalendarGrid.tsx
│   ├── CalendarHeader.tsx
│   ├── TimeSlot.tsx
│   ├── ScheduledClassCard.tsx
│   ├── LessonBankSidebar.tsx
│   ├── ScheduleClassModal.tsx
│   └── CurrentTimeIndicator.tsx
├── session/
│   ├── StudentGrid.tsx
│   ├── StudentCard.tsx
│   ├── SessionHeader.tsx
│   ├── SessionSidebar.tsx
│   └── SessionStats.tsx
├── lessons/
│   ├── ResourceCard.tsx
│   ├── ResourceGrid.tsx
│   ├── LessonEditor.tsx
│   ├── ExerciseList.tsx
│   └── CreateResourceModal.tsx
├── auth/
│   ├── LoginForm.tsx
│   ├── RoleSelector.tsx
│   ├── TeacherLoginForm.tsx
│   └── StudentLoginForm.tsx
└── common/
    ├── StatusBadge.tsx
    ├── StatusDot.tsx
    ├── ResourceIcon.tsx
    ├── Avatar.tsx
    └── EmptyState.tsx
```

---

## 5. APIs

### 5.1 APIs Nuevas

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/resources` | GET | Listar recursos del profesor |
| `/api/resources` | POST | Crear nuevo recurso |
| `/api/resources/[id]` | GET | Obtener recurso |
| `/api/resources/[id]` | PUT | Actualizar recurso |
| `/api/resources/[id]` | DELETE | Eliminar recurso |
| `/api/scheduled-classes` | GET | Listar clases programadas (query: week, date) |
| `/api/scheduled-classes` | POST | Crear clase programada |
| `/api/scheduled-classes/[id]` | PUT | Modificar clase programada |
| `/api/scheduled-classes/[id]` | DELETE | Eliminar clase programada |
| `/api/scheduled-classes/[id]/start` | POST | Activar clase → crea Session |

### 5.2 APIs Modificadas

| Endpoint | Cambio |
|----------|--------|
| `/api/lessons/[id]` | Devuelve ejercicios con `resource` poblado |
| `/api/lessons/[id]/exercises` | POST recibe `resourceId` en lugar de `title`+`url` |

### 5.3 APIs Sin Cambios

- `/api/groups` — CRUD grupos
- `/api/groups/[id]/students` — Estudiantes del grupo
- `/api/sessions/[id]` — Detalles sesión
- `/api/sessions/[id]/attendance` — Asistencia en tiempo real
- `/api/student/session/join` — Estudiante se une
- `/api/student/session/heartbeat` — Heartbeat del estudiante

---

## 6. Flujos de Usuario

### 6.1 Programar y Activar Clase

```
1. Profesor va a /dashboard/calendar
2. Arrastra lección del "Banco de Lecciones" al slot deseado
3. Se abre modal "Programar Lección":
   - Día y hora (pre-llenados del slot)
   - Grupo (selector)
   - Duración (selector)
   - Notas (opcional)
   - Checkbox "Repetir semanalmente"
4. Click "Confirmar"
5. POST /api/scheduled-classes → guarda ScheduledClass
6. Calendario muestra la clase programada
7. Cuando llega la hora, profesor hace click "Iniciar Sesión"
8. POST /api/scheduled-classes/[id]/start
   → Crea Session con datos de ScheduledClass
   → Devuelve sessionId
9. Redirect a /dashboard/sessions/[sessionId]
```

### 6.2 Login Profesor

```
1. Usuario va a /
2. Selecciona rol "Profesor"
3. Completa email + contraseña
4. POST → NextAuth credentials
5. Redirect a /dashboard
```

### 6.3 Login Estudiante

```
1. Usuario va a /
2. Selecciona rol "Estudiante"
3. Completa username + código de sesión
4. POST /api/student/session/join
   → Valida código, encuentra sesión activa
   → Crea SessionAttendance
5. Redirect a /class/session
```

### 6.4 Crear Recurso y Añadir a Lección

```
1. Profesor va a /dashboard/lessons
2. Click "Nuevo Recurso"
3. Modal: selecciona tipo (Video, PDF, URL, Texto)
4. Completa campos según tipo
5. POST /api/resources → guarda Resource
6. Para añadir a lección: va a /dashboard/lessons/[id]
7. Arrastra recurso de biblioteca a la lección
8. POST /api/lessons/[id]/exercises con resourceId
```

---

## 7. Stack Tecnológico

### Dependencias Existentes (sin cambios)

- Next.js 16 + React 19
- PostgreSQL + Prisma
- NextAuth.js
- Tailwind CSS 4
- Supabase (real-time)

### Dependencias Nuevas

```bash
# shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button dialog input select dropdown-menu toast badge tabs

# Drag and Drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Fuentes (vía CSS)

```css
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Noto+Sans:wght@400;500;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
```

---

## 8. Pantallas

### 8.1 Login Unificado (/)

- Selector de rol: Estudiante / Profesor
- Formulario dinámico según rol
- Profesor: email + contraseña
- Estudiante: username + código sesión
- Diseño centrado con fondo con gradientes sutiles

### 8.2 Dashboard (/dashboard)

- Saludo personalizado con nombre del profesor
- Sección "En Vivo Ahora" con cards de sesiones activas (indicador LIVE pulsante)
- Sección "Mis Clases" con grid de grupos
- Banner de biblioteca con acceso rápido
- Stats rápidos (opcional)

### 8.3 Calendario (/dashboard/calendar)

- Header: navegación semana anterior/siguiente, toggle Semana/Mes, botón guardar
- Grid principal: columna de horas (08:00-18:00) + columnas por día (Lun-Vie)
- Clases programadas como cards en el grid con color por asignatura
- Indicador de hora actual (línea roja)
- Sidebar derecho: "Banco de Lecciones" con lecciones arrastrables
- Búsqueda y filtros en el banco

### 8.4 Biblioteca de Recursos (/dashboard/lessons)

- Tabs: Recursos / Lecciones
- Grid de recursos con cards (thumbnail, tipo, título, duración)
- Filtros por tipo (Video, PDF, URL, Texto)
- Búsqueda
- Botón crear nuevo recurso
- Click en lección → va al editor

### 8.5 Editor de Lección (/dashboard/lessons/[id])

- Layout 2 columnas
- Izquierda: biblioteca de recursos (draggable)
- Derecha: lección actual con ejercicios ordenables
- Cada ejercicio: drag handle, info del recurso, botones editar/eliminar
- Drop zone para añadir nuevos ejercicios
- Botón guardar

### 8.6 Sesión en Vivo - Profesor (/dashboard/sessions/[id])

- Header: logo, nombre clase, código sesión copiable, botón finalizar
- Sidebar izquierdo: timer, stats (activos/distraídos/idle/offline), botón alerta general
- Main: filtros (Todos, Activos, Distraídos, Inactivos), búsqueda, grid de estudiantes
- Card estudiante: avatar con iniciales, nombre, estado, tiempo en estado actual
- Estados visuales diferenciados (bordes, colores, animaciones)

### 8.7 Sesión en Vivo - Estudiante (/class/session)

- Header: logo, nombre clase + profesor, timer sesión
- Main: contenido del ejercicio actual (iframe/embed)
- Sidebar derecho: lista de ejercicios con progreso, instrucciones, botones "Levantar mano" / "Preguntar"
- Indicador de estado propio (FOCUSED badge)
- Navegación prev/next ejercicio

### 8.8 Detalle de Grupo (/dashboard/groups/[id])

- Breadcrumb: Inicio / Mis Grupos / [Nombre]
- Header: nombre grupo, horario, indicador si hay sesión activa
- Stats cards: total estudiantes, promedio atención, asistencia hoy, alertas
- Tabla de estudiantes: avatar, nombre, email, estado, barra de atención, acciones
- Estudiantes con alerta destacados visualmente
- Paginación

---

## 9. Consideraciones de Migración

### Datos Existentes

1. **Exercise** tiene `title` y `url` → migrar a Resources
   - Crear Resource por cada Exercise único
   - Actualizar Exercise para referenciar Resource
   - Eliminar campos `title` y `url` de Exercise

### Script de Migración

```typescript
// scripts/migrate-exercises-to-resources.ts
// 1. Obtener todos los exercises con title/url únicos
// 2. Crear Resource para cada uno
// 3. Actualizar exercises con resourceId
// 4. Verificar integridad
```

---

## 10. Orden de Implementación Sugerido

### Fase 1: Fundamentos
1. Actualizar Prisma schema (nuevos modelos)
2. Migrar datos existentes
3. Configurar Tailwind con nuevo sistema de diseño
4. Crear estructura de estilos DRY
5. Inicializar shadcn/ui
6. Instalar dnd-kit

### Fase 2: Layout y Auth
7. Crear componentes de layout (Sidebar, Header)
8. Rediseñar página de login unificado
9. Ajustar flujos de auth

### Fase 3: Dashboard
10. Rediseñar dashboard principal
11. Crear componentes de cards (LiveSession, Group, Stats)

### Fase 4: Biblioteca y Lecciones
12. APIs de recursos
13. Página de biblioteca
14. Editor de lección con drag & drop

### Fase 5: Calendario
15. APIs de scheduled-classes
16. Componente CalendarGrid
17. Drag & drop de lecciones al calendario
18. Modal de programación
19. Flujo de activar sesión

### Fase 6: Sesiones
20. Rediseñar vista profesor de sesión
21. Rediseñar vista estudiante de sesión

### Fase 7: Detalle y Pulido
22. Rediseñar detalle de grupo
23. Testing end-to-end
24. Ajustes de responsive
25. Optimizaciones de rendimiento

---

## Aprobaciones

- [x] Modelo de datos
- [x] Estructura de rutas
- [x] Sistema de diseño (colores, fuentes, iconos)
- [x] Sistema de estilos DRY
- [x] Uso de shadcn/ui
- [x] Uso de dnd-kit
- [x] APIs
- [x] Flujos de usuario
- [x] Pantallas
