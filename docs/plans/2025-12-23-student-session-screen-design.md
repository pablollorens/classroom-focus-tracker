# Diseño: Pantalla de Sesión del Estudiante

## Resumen

Mejora de la pantalla `/class/session` para mostrar el contenido de la lección y la información de la sesión, permitiendo que el estudiante trabaje directamente desde esta pantalla.

## Estructura General

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: Logo, título lección, estado enfoque, salir   │
├────────────────┬────────────────────────────────────────┤
│                │                                        │
│   SIDEBAR      │         ÁREA PRINCIPAL                 │
│   IZQUIERDO    │                                        │
│                │   Visor de contenido del recurso       │
│   Lista de     │   seleccionado (video, PDF, texto,     │
│   recursos     │   iframe para URLs)                    │
│   navegable    │                                        │
│                │                                        │
├────────────────┴────────────────────────────────────────┤
│  PANEL INFERIOR: Timer de sesión | Nombre del profesor │
└─────────────────────────────────────────────────────────┘
```

## Componentes

### 1. Header (existente, sin cambios mayores)

- Logo de la app
- Título de la lección
- Indicador de estado de enfoque (Enfocado/Inactivo/Distraído)
- Botón "Salir"

### 2. Sidebar de Recursos

**Elementos:**
- Título "Recursos" con contador (ej: "Recursos (5)")
- Lista de recursos en orden, cada uno muestra:
  - Ícono según tipo (video/PDF/URL/texto)
  - Título del recurso
  - Duración estimada (si existe)

**Estados visuales:**
- **Normal**: Fondo oscuro, texto gris claro
- **Seleccionado**: Borde azul izquierdo, fondo ligeramente más claro
- **Hover**: Fondo con hover sutil

### 3. Área Principal (Visor de Contenido)

**Comportamiento según tipo de recurso:**

| Tipo | Cómo se muestra |
|------|-----------------|
| VIDEO | Iframe embebido (YouTube, Vimeo, etc.) |
| PDF | Iframe con el PDF o enlace para abrir en nueva pestaña |
| URL | Iframe embebido del sitio externo |
| TEXT | Contenido de texto renderizado directamente |

**Estado vacío:**
Mensaje "Selecciona un recurso de la lista para comenzar"

**Fallback:**
Si el iframe falla o está bloqueado, mostrar botón "Abrir en nueva pestaña"

### 4. Panel Inferior (Info de Sesión)

```
┌──────────────────────────────────────────────────────────────────┐
│  ⏱ 45:32 en sesión  │  👨‍🏫 Prof. García  │  [✋ Levantar mano]  │
└──────────────────────────────────────────────────────────────────┘
```

- Barra fija en la parte inferior
- Timer actualizado cada segundo (tiempo desde inicio de sesión)
- Nombre del profesor
- Botón "Levantar mano" con toggle

**Comportamiento del botón "Levantar mano":**
- **Estado normal**: "✋ Levantar mano" (botón con borde)
- **Mano levantada**: "✋ Bajar mano" (botón resaltado/activo con animación sutil)
- El profesor ve en su panel un ícono ✋ junto a los estudiantes con mano levantada

## Datos Necesarios

Para implementar esta pantalla, se necesita cargar:

1. **Datos de la sesión** (ya disponibles parcialmente):
   - `sessionId`
   - `startedAt` (para el timer)
   - Profesor asociado (nombre)

2. **Lección y recursos** (nuevo endpoint necesario):
   - `PreparedLesson` con sus `Exercise[]`
   - Cada `Exercise` con su `Resource` (title, type, url, content, duration)

## API Endpoint Necesario

`GET /api/sessions/[sessionId]/content`

Respuesta:
```json
{
  "session": {
    "id": "...",
    "startedAt": "2025-12-23T10:00:00Z",
    "teacher": {
      "email": "profesor@escuela.com"
    }
  },
  "lesson": {
    "title": "Matemáticas - Fracciones",
    "exercises": [
      {
        "id": "...",
        "orderIndex": 0,
        "resource": {
          "id": "...",
          "title": "Video introductorio",
          "type": "VIDEO",
          "url": "https://youtube.com/...",
          "duration": 5
        }
      }
    ]
  }
}
```

## Cambios en Base de Datos

```prisma
model SessionAttendance {
  // ... campos existentes
  handRaised Boolean @default(false)
}
```

## API Endpoints Adicionales

`POST /api/sessions/[sessionId]/hand`

Body: `{ "raised": true | false }`

Actualiza el campo `handRaised` en `SessionAttendance` para el estudiante actual.

## Decisiones Técnicas

- **Sin real-time para compañeros**: Para evitar queries excesivas, no se muestra el estado de los compañeros
- **Lista navegable**: El estudiante tiene libertad de elegir qué recurso ver (no secuencial)
- **Iframe con fallback**: Si el contenido no carga en iframe, ofrecer abrir en nueva pestaña
- **Hand raise via existing real-time**: El profesor ya usa Supabase real-time para ver estados, así que verá la mano levantada sin cambios adicionales
