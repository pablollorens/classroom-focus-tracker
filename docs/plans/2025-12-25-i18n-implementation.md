# i18n Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-language support (Dutch, Spanish, English) using next-intl with browser detection and cookie persistence.

**Architecture:** next-intl with cookie-based locale storage (no URL prefixes). Language selector in Header. Dictionaries organized by namespace in JSON files.

**Tech Stack:** next-intl, Next.js 16 App Router, React 19

---

## Task 1: Install next-intl

**Files:**
- Modify: `package.json`

**Step 1: Install dependency**

Run:
```bash
npm install next-intl
```

**Step 2: Verify installation**

Run:
```bash
npm ls next-intl
```

Expected: Shows next-intl version installed

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install next-intl for internationalization"
```

---

## Task 2: Create i18n configuration

**Files:**
- Create: `src/i18n/config.ts`
- Create: `src/i18n/request.ts`

**Step 1: Create config file**

Create `src/i18n/config.ts`:

```typescript
export const locales = ['nl', 'es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'nl';

export const localeNames: Record<Locale, string> = {
  nl: 'Nederlands',
  es: 'Español',
  en: 'English',
};

export const localeFlags: Record<Locale, string> = {
  nl: '🇳🇱',
  es: '🇪🇸',
  en: '🇬🇧',
};
```

**Step 2: Create request config**

Create `src/i18n/request.ts`:

```typescript
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { defaultLocale, locales, type Locale } from './config';

function getLocaleFromAcceptLanguage(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage) return null;

  const languages = acceptLanguage.split(',').map(lang => {
    const [code] = lang.trim().split(';');
    return code.split('-')[0].toLowerCase();
  });

  for (const lang of languages) {
    if (locales.includes(lang as Locale)) {
      return lang as Locale;
    }
  }

  return null;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headersList = await headers();

  // 1. Check cookie first
  const localeCookie = cookieStore.get('locale')?.value;
  if (localeCookie && locales.includes(localeCookie as Locale)) {
    return {
      locale: localeCookie,
      messages: (await import(`./messages/${localeCookie}.json`)).default,
    };
  }

  // 2. Try browser language detection
  const acceptLanguage = headersList.get('accept-language');
  const detectedLocale = getLocaleFromAcceptLanguage(acceptLanguage);

  if (detectedLocale) {
    return {
      locale: detectedLocale,
      messages: (await import(`./messages/${detectedLocale}.json`)).default,
    };
  }

  // 3. Fall back to default
  return {
    locale: defaultLocale,
    messages: (await import(`./messages/${defaultLocale}.json`)).default,
  };
});
```

**Step 3: Verify files exist**

Run:
```bash
ls -la src/i18n/
```

Expected: Shows config.ts and request.ts

**Step 4: Commit**

```bash
git add src/i18n/
git commit -m "feat(i18n): add next-intl configuration with browser detection"
```

---

## Task 3: Create dictionary files

**Files:**
- Create: `src/i18n/messages/en.json`
- Create: `src/i18n/messages/es.json`
- Create: `src/i18n/messages/nl.json`

**Step 1: Create English dictionary**

Create `src/i18n/messages/en.json`:

```json
{
  "common": {
    "loading": "Loading...",
    "save": "Save",
    "saving": "Saving...",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "close": "Close",
    "back": "Back",
    "error": "An error occurred",
    "success": "Success",
    "confirm": "Confirm"
  },
  "sidebar": {
    "dashboard": "Dashboard",
    "library": "Library",
    "schedule": "Schedule",
    "reports": "Reports"
  },
  "header": {
    "appName": "Classroom Focus Tracker"
  },
  "dashboard": {
    "welcome": "Hello, {name}",
    "subtitle": "Manage your classes and monitor student progress.",
    "liveNow": "Live Now",
    "myClasses": "My Classes",
    "newGroup": "New Group",
    "groupName": "Group Name",
    "groupNamePlaceholder": "E.g. Math 101",
    "noGroups": "No groups",
    "noGroupsDescription": "Create your first class group to start monitoring your students.",
    "createGroup": "Create Group",
    "students": "{count} students",
    "viewSession": "View Session",
    "quickLinks": "Quick Links",
    "libraryDescription": "Manage resources and lessons",
    "scheduleDescription": "Schedule your classes",
    "reportsDescription": "Coming soon"
  },
  "lessons": {
    "title": "Library",
    "newLesson": "New Lesson",
    "lessonTitle": "Lesson Title",
    "description": "Description",
    "exercises": "Exercises",
    "resources": "Resources",
    "noLessons": "No lessons",
    "noLessonsDescription": "Create your first lesson to get started.",
    "createLesson": "Create Lesson",
    "addExercise": "Add Exercise",
    "exerciseTitle": "Exercise Title",
    "exerciseType": "Type",
    "url": "URL",
    "content": "Content"
  },
  "calendar": {
    "title": "Schedule",
    "today": "Today",
    "thisWeek": "This Week",
    "noClasses": "No classes scheduled",
    "noClassesDescription": "Schedule classes from your lesson library.",
    "scheduleClass": "Schedule Class",
    "selectGroup": "Select group",
    "selectLesson": "Select lesson",
    "dateTime": "Date & Time",
    "startSession": "Start Session"
  },
  "session": {
    "live": "Live",
    "ended": "Ended",
    "startSession": "Start Session",
    "endSession": "End Session",
    "students": "Students",
    "focused": "Focused",
    "distracted": "Distracted",
    "away": "Away",
    "content": "Content",
    "raiseHand": "Raise Hand",
    "lowerHand": "Lower Hand",
    "handRaised": "Hand Raised",
    "waitingForContent": "Waiting for content...",
    "teacherWillShare": "The teacher will share content soon.",
    "currentExercise": "Current Exercise",
    "noActiveSession": "No active session"
  },
  "auth": {
    "signIn": "Sign In",
    "signOut": "Sign Out",
    "signingIn": "Signing in...",
    "studentLogin": "Student Login",
    "teacherLogin": "Teacher Login",
    "enterUsername": "Enter the username provided by your teacher",
    "username": "Username",
    "usernamePlaceholder": "e.g. math101.john.doe",
    "invalidUsername": "Invalid username. Please check with your teacher.",
    "somethingWentWrong": "Something went wrong",
    "areYouTeacher": "Are you a teacher?"
  },
  "groups": {
    "title": "Group",
    "students": "Students",
    "addStudent": "Add Student",
    "studentName": "Student Name",
    "studentNamePlaceholder": "E.g. John Doe",
    "noStudents": "No students",
    "noStudentsDescription": "Add students to this group to get started.",
    "deleteGroup": "Delete Group",
    "deleteGroupConfirm": "Are you sure you want to delete this group? All students and session data will be permanently removed.",
    "deleteStudent": "Remove Student",
    "deleteStudentConfirm": "Are you sure you want to remove this student from the group?"
  },
  "modal": {
    "confirmDelete": "Delete",
    "cancel": "Cancel"
  }
}
```

**Step 2: Create Spanish dictionary**

Create `src/i18n/messages/es.json`:

```json
{
  "common": {
    "loading": "Cargando...",
    "save": "Guardar",
    "saving": "Guardando...",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "create": "Crear",
    "close": "Cerrar",
    "back": "Volver",
    "error": "Ha ocurrido un error",
    "success": "Éxito",
    "confirm": "Confirmar"
  },
  "sidebar": {
    "dashboard": "Dashboard",
    "library": "Biblioteca",
    "schedule": "Horario",
    "reports": "Reportes"
  },
  "header": {
    "appName": "Classroom Focus Tracker"
  },
  "dashboard": {
    "welcome": "Hola, {name}",
    "subtitle": "Gestiona tus clases y monitorea el progreso de tus estudiantes.",
    "liveNow": "En Vivo Ahora",
    "myClasses": "Mis Clases",
    "newGroup": "Nuevo Grupo",
    "groupName": "Nombre del Grupo",
    "groupNamePlaceholder": "Ej: Matemáticas 101",
    "noGroups": "Sin grupos",
    "noGroupsDescription": "Crea tu primer grupo de clase para comenzar a monitorear a tus estudiantes.",
    "createGroup": "Crear Grupo",
    "students": "{count} estudiantes",
    "viewSession": "Ver Sesión",
    "quickLinks": "Accesos Rápidos",
    "libraryDescription": "Gestiona recursos y lecciones",
    "scheduleDescription": "Programa tus clases",
    "reportsDescription": "Próximamente"
  },
  "lessons": {
    "title": "Biblioteca",
    "newLesson": "Nueva Lección",
    "lessonTitle": "Título de la Lección",
    "description": "Descripción",
    "exercises": "Ejercicios",
    "resources": "Recursos",
    "noLessons": "Sin lecciones",
    "noLessonsDescription": "Crea tu primera lección para comenzar.",
    "createLesson": "Crear Lección",
    "addExercise": "Agregar Ejercicio",
    "exerciseTitle": "Título del Ejercicio",
    "exerciseType": "Tipo",
    "url": "URL",
    "content": "Contenido"
  },
  "calendar": {
    "title": "Horario",
    "today": "Hoy",
    "thisWeek": "Esta Semana",
    "noClasses": "Sin clases programadas",
    "noClassesDescription": "Programa clases desde tu biblioteca de lecciones.",
    "scheduleClass": "Programar Clase",
    "selectGroup": "Seleccionar grupo",
    "selectLesson": "Seleccionar lección",
    "dateTime": "Fecha y Hora",
    "startSession": "Iniciar Sesión"
  },
  "session": {
    "live": "En Vivo",
    "ended": "Finalizada",
    "startSession": "Iniciar Sesión",
    "endSession": "Finalizar Sesión",
    "students": "Estudiantes",
    "focused": "Enfocado",
    "distracted": "Distraído",
    "away": "Ausente",
    "content": "Contenido",
    "raiseHand": "Levantar Mano",
    "lowerHand": "Bajar Mano",
    "handRaised": "Mano Levantada",
    "waitingForContent": "Esperando contenido...",
    "teacherWillShare": "El profesor compartirá contenido pronto.",
    "currentExercise": "Ejercicio Actual",
    "noActiveSession": "Sin sesión activa"
  },
  "auth": {
    "signIn": "Iniciar Sesión",
    "signOut": "Cerrar Sesión",
    "signingIn": "Iniciando sesión...",
    "studentLogin": "Login Estudiante",
    "teacherLogin": "Login Profesor",
    "enterUsername": "Ingresa el usuario proporcionado por tu profesor",
    "username": "Usuario",
    "usernamePlaceholder": "ej: math101.juan.perez",
    "invalidUsername": "Usuario inválido. Consulta con tu profesor.",
    "somethingWentWrong": "Algo salió mal",
    "areYouTeacher": "¿Eres profesor?"
  },
  "groups": {
    "title": "Grupo",
    "students": "Estudiantes",
    "addStudent": "Agregar Estudiante",
    "studentName": "Nombre del Estudiante",
    "studentNamePlaceholder": "Ej: Juan Pérez",
    "noStudents": "Sin estudiantes",
    "noStudentsDescription": "Agrega estudiantes a este grupo para comenzar.",
    "deleteGroup": "Eliminar Grupo",
    "deleteGroupConfirm": "¿Estás seguro de que quieres eliminar este grupo? Todos los estudiantes y datos de sesiones serán eliminados permanentemente.",
    "deleteStudent": "Eliminar Estudiante",
    "deleteStudentConfirm": "¿Estás seguro de que quieres eliminar a este estudiante del grupo?"
  },
  "modal": {
    "confirmDelete": "Eliminar",
    "cancel": "Cancelar"
  }
}
```

**Step 3: Create Dutch dictionary**

Create `src/i18n/messages/nl.json`:

```json
{
  "common": {
    "loading": "Laden...",
    "save": "Opslaan",
    "saving": "Opslaan...",
    "cancel": "Annuleren",
    "delete": "Verwijderen",
    "edit": "Bewerken",
    "create": "Maken",
    "close": "Sluiten",
    "back": "Terug",
    "error": "Er is een fout opgetreden",
    "success": "Gelukt",
    "confirm": "Bevestigen"
  },
  "sidebar": {
    "dashboard": "Dashboard",
    "library": "Bibliotheek",
    "schedule": "Rooster",
    "reports": "Rapporten"
  },
  "header": {
    "appName": "Classroom Focus Tracker"
  },
  "dashboard": {
    "welcome": "Hallo, {name}",
    "subtitle": "Beheer je klassen en volg de voortgang van je leerlingen.",
    "liveNow": "Nu Live",
    "myClasses": "Mijn Klassen",
    "newGroup": "Nieuwe Groep",
    "groupName": "Groepsnaam",
    "groupNamePlaceholder": "Bijv. Wiskunde 101",
    "noGroups": "Geen groepen",
    "noGroupsDescription": "Maak je eerste klasgroep om je leerlingen te volgen.",
    "createGroup": "Groep Maken",
    "students": "{count} leerlingen",
    "viewSession": "Sessie Bekijken",
    "quickLinks": "Snelkoppelingen",
    "libraryDescription": "Beheer bronnen en lessen",
    "scheduleDescription": "Plan je lessen",
    "reportsDescription": "Binnenkort beschikbaar"
  },
  "lessons": {
    "title": "Bibliotheek",
    "newLesson": "Nieuwe Les",
    "lessonTitle": "Lestitel",
    "description": "Beschrijving",
    "exercises": "Oefeningen",
    "resources": "Bronnen",
    "noLessons": "Geen lessen",
    "noLessonsDescription": "Maak je eerste les om te beginnen.",
    "createLesson": "Les Maken",
    "addExercise": "Oefening Toevoegen",
    "exerciseTitle": "Oefeningstitel",
    "exerciseType": "Type",
    "url": "URL",
    "content": "Inhoud"
  },
  "calendar": {
    "title": "Rooster",
    "today": "Vandaag",
    "thisWeek": "Deze Week",
    "noClasses": "Geen lessen gepland",
    "noClassesDescription": "Plan lessen vanuit je lesbibliotheek.",
    "scheduleClass": "Les Plannen",
    "selectGroup": "Selecteer groep",
    "selectLesson": "Selecteer les",
    "dateTime": "Datum & Tijd",
    "startSession": "Sessie Starten"
  },
  "session": {
    "live": "Live",
    "ended": "Beëindigd",
    "startSession": "Sessie Starten",
    "endSession": "Sessie Beëindigen",
    "students": "Leerlingen",
    "focused": "Gefocust",
    "distracted": "Afgeleid",
    "away": "Afwezig",
    "content": "Inhoud",
    "raiseHand": "Hand Opsteken",
    "lowerHand": "Hand Laten Zakken",
    "handRaised": "Hand Opgestoken",
    "waitingForContent": "Wachten op inhoud...",
    "teacherWillShare": "De leraar zal binnenkort inhoud delen.",
    "currentExercise": "Huidige Oefening",
    "noActiveSession": "Geen actieve sessie"
  },
  "auth": {
    "signIn": "Inloggen",
    "signOut": "Uitloggen",
    "signingIn": "Inloggen...",
    "studentLogin": "Leerling Login",
    "teacherLogin": "Leraar Login",
    "enterUsername": "Voer de gebruikersnaam in die je leraar je heeft gegeven",
    "username": "Gebruikersnaam",
    "usernamePlaceholder": "bijv. wiskunde101.jan.jansen",
    "invalidUsername": "Ongeldige gebruikersnaam. Vraag het aan je leraar.",
    "somethingWentWrong": "Er ging iets mis",
    "areYouTeacher": "Ben je een leraar?"
  },
  "groups": {
    "title": "Groep",
    "students": "Leerlingen",
    "addStudent": "Leerling Toevoegen",
    "studentName": "Naam Leerling",
    "studentNamePlaceholder": "Bijv. Jan Jansen",
    "noStudents": "Geen leerlingen",
    "noStudentsDescription": "Voeg leerlingen toe aan deze groep om te beginnen.",
    "deleteGroup": "Groep Verwijderen",
    "deleteGroupConfirm": "Weet je zeker dat je deze groep wilt verwijderen? Alle leerlingen en sessiegegevens worden permanent verwijderd.",
    "deleteStudent": "Leerling Verwijderen",
    "deleteStudentConfirm": "Weet je zeker dat je deze leerling uit de groep wilt verwijderen?"
  },
  "modal": {
    "confirmDelete": "Verwijderen",
    "cancel": "Annuleren"
  }
}
```

**Step 4: Verify dictionaries**

Run:
```bash
ls -la src/i18n/messages/
```

Expected: Shows en.json, es.json, nl.json

**Step 5: Commit**

```bash
git add src/i18n/messages/
git commit -m "feat(i18n): add English, Spanish and Dutch dictionaries"
```

---

## Task 4: Configure Next.js for next-intl

**Files:**
- Create: `src/middleware.ts`
- Modify: `next.config.ts` (if exists) or `next.config.js`

**Step 1: Check for existing next.config**

Run:
```bash
ls next.config.*
```

**Step 2: Create or update Next.js config**

Create/update `next.config.ts`:

```typescript
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);
```

**Step 3: Create middleware**

Create `src/middleware.ts`:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale, type Locale } from "./i18n/config";

function getLocaleFromAcceptLanguage(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage) return null;

  const languages = acceptLanguage.split(",").map((lang) => {
    const [code] = lang.trim().split(";");
    return code.split("-")[0].toLowerCase();
  });

  for (const lang of languages) {
    if (locales.includes(lang as Locale)) {
      return lang as Locale;
    }
  }

  return null;
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Check if locale cookie exists
  const localeCookie = request.cookies.get("locale")?.value;

  if (!localeCookie || !locales.includes(localeCookie as Locale)) {
    // Try to detect from browser
    const acceptLanguage = request.headers.get("accept-language");
    const detectedLocale = getLocaleFromAcceptLanguage(acceptLanguage) || defaultLocale;

    // Set cookie for future requests
    response.cookies.set("locale", detectedLocale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

**Step 4: Verify files**

Run:
```bash
ls src/middleware.ts next.config.*
```

Expected: Shows both files

**Step 5: Commit**

```bash
git add src/middleware.ts next.config.ts
git commit -m "feat(i18n): add middleware for locale detection and Next.js plugin"
```

---

## Task 5: Update Providers and Layout

**Files:**
- Modify: `src/components/Providers.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: Update Providers**

Replace `src/components/Providers.tsx`:

```typescript
"use client";

import { SessionProvider } from "next-auth/react";
import { NextIntlClientProvider, AbstractIntlMessages } from "next-intl";

interface ProvidersProps {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
}

export function Providers({ children, locale, messages }: ProvidersProps) {
  return (
    <SessionProvider>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
```

**Step 2: Update root layout**

Replace `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Classroom Focus Tracker",
  description: "Real-time student attention monitoring",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Noto+Sans:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

**Step 3: Test app starts**

Run:
```bash
npm run dev
```

Expected: App starts without errors (check localhost:3000)

**Step 4: Commit**

```bash
git add src/components/Providers.tsx src/app/layout.tsx
git commit -m "feat(i18n): integrate next-intl provider in layout"
```

---

## Task 6: Create LanguageSelector component

**Files:**
- Create: `src/components/LanguageSelector.tsx`
- Modify: `src/components/layout/Header.tsx`

**Step 1: Create LanguageSelector**

Create `src/components/LanguageSelector.tsx`:

```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { locales, localeNames, localeFlags, type Locale } from "@/i18n/config";

export function LanguageSelector() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    // Set cookie
    document.cookie = `locale=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;
    setIsOpen(false);
    // Refresh to apply new locale
    router.refresh();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-overlay)] hover:bg-[var(--surface-raised)] transition-colors text-sm"
        aria-label="Select language"
      >
        <span>{localeFlags[locale]}</span>
        <span className="text-white font-medium uppercase">{locale}</span>
        <span className="material-symbols-outlined text-[var(--text-muted)] text-lg">
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg shadow-xl z-50 overflow-hidden">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-overlay)] transition-colors ${
                loc === locale ? "bg-[var(--surface-overlay)]" : ""
              }`}
            >
              <span className="text-lg">{localeFlags[loc]}</span>
              <span className="text-white">{localeNames[loc]}</span>
              {loc === locale && (
                <span className="material-symbols-outlined text-[var(--color-primary)] ml-auto">
                  check
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Update Header**

Replace `src/components/layout/Header.tsx`:

```typescript
"use client";

import { useSession } from "next-auth/react";
import { SignOutButton } from "@/components/SignOutButton";
import { LanguageSelector } from "@/components/LanguageSelector";

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
          <div className="flex-center size-8 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-blue-600 text-white">
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
        {/* Language Selector */}
        <LanguageSelector />

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

**Step 3: Test language selector**

Run:
```bash
npm run dev
```

Expected: Language selector appears in header, clicking changes language

**Step 4: Commit**

```bash
git add src/components/LanguageSelector.tsx src/components/layout/Header.tsx
git commit -m "feat(i18n): add language selector to header"
```

---

## Task 7: Migrate Sidebar component

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Step 1: Update Sidebar with translations**

Replace `src/components/layout/Sidebar.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

interface NavItem {
  href: string;
  labelKey: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: "dashboard" },
  { href: "/dashboard/lessons", labelKey: "library", icon: "local_library" },
  { href: "/dashboard/calendar", labelKey: "schedule", icon: "calendar_month" },
  { href: "/dashboard/reports", labelKey: "reports", icon: "bar_chart" },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("sidebar");

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
            <span className="text-[var(--color-primary)] text-base font-bold leading-tight tracking-tight">
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
                {t(item.labelKey)}
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

**Step 2: Test sidebar translations**

Run:
```bash
npm run dev
```

Expected: Sidebar shows translated labels based on selected language

**Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(i18n): translate Sidebar navigation labels"
```

---

## Task 8: Migrate Dashboard page

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Step 1: Update Dashboard with translations**

Read the current file, then update it to use translations. Key changes:

1. Add `import { useTranslations } from "next-intl";`
2. Add `const t = useTranslations("dashboard");` and `const tc = useTranslations("common");`
3. Replace hardcoded strings:
   - `"Cargando..."` → `{tc("loading")}`
   - `"Hola, ..."` → `{t("welcome", { name: ... })}`
   - `"Gestiona tus clases..."` → `{t("subtitle")}`
   - `"En Vivo Ahora"` → `{t("liveNow")}`
   - `"Mis Clases"` → `{t("myClasses")}`
   - `"Nuevo Grupo"` → `{t("newGroup")}`
   - `"Nombre del Grupo"` → `{t("groupName")}`
   - `"Ej: Matemáticas 101"` → `{t("groupNamePlaceholder")}`
   - `"Cancelar"` → `{tc("cancel")}`
   - `"Guardando..."` / `"Guardar"` → `{tc("saving")}` / `{tc("save")}`
   - `"Sin grupos"` → `{t("noGroups")}`
   - `"Crea tu primer grupo..."` → `{t("noGroupsDescription")}`
   - `"Crear Grupo"` → `{t("createGroup")}`
   - `"X estudiantes"` → `{t("students", { count: X })}`
   - `"Ver Sesión"` → `{t("viewSession")}`
   - `"Accesos Rápidos"` → `{t("quickLinks")}`
   - `"Biblioteca"` → Translated via sidebar namespace
   - `"Gestiona recursos y lecciones"` → `{t("libraryDescription")}`
   - `"Horario"` → Translated via sidebar namespace
   - `"Programa tus clases"` → `{t("scheduleDescription")}`
   - `"Reportes"` → Translated via sidebar namespace
   - `"Próximamente"` → `{t("reportsDescription")}`

**Step 2: Test dashboard translations**

Run:
```bash
npm run dev
```

Navigate to /dashboard and test language switching.

Expected: All text changes when language is switched

**Step 3: Commit**

```bash
git add src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat(i18n): translate Dashboard page"
```

---

## Task 9: Migrate remaining pages

**Files:**
- Modify: `src/app/(dashboard)/dashboard/lessons/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/calendar/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/groups/[groupId]/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/sessions/[sessionId]/page.tsx`
- Modify: `src/app/(marketing)/student/login/page.tsx`
- Modify: `src/app/(classroom)/class/session/page.tsx`

For each file:
1. Add `import { useTranslations } from "next-intl";`
2. Add appropriate `useTranslations` calls for namespaces used
3. Replace all hardcoded strings with `t("key")` or `t("key", { param: value })`
4. Test the page with language switching
5. Commit after each file or logical group

**Step 1: Migrate one page at a time**

Follow the pattern from Task 8 for each page.

**Step 2: Test each page**

After each migration, verify translations work.

**Step 3: Commit after each page**

```bash
git add <file>
git commit -m "feat(i18n): translate <PageName> page"
```

---

## Task 10: Migrate common components

**Files:**
- Modify: `src/components/common/ConfirmModal.tsx`
- Modify: `src/components/common/StatusBadge.tsx`
- Modify: `src/components/SignOutButton.tsx`

**Step 1: Update ConfirmModal**

The ConfirmModal receives `confirmText` and `cancelText` as props, so the calling component should pass translated strings. Update default values:

```typescript
// Change defaults to use translations in calling components
// Or make the component use translations internally
```

**Step 2: Update SignOutButton**

```typescript
"use client";

import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";

export function SignOutButton() {
  const t = useTranslations("auth");

  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="btn-ghost btn-sm flex items-center gap-2"
    >
      <span className="material-symbols-outlined text-lg">logout</span>
      <span className="hidden sm:inline">{t("signOut")}</span>
    </button>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/
git commit -m "feat(i18n): translate common components"
```

---

## Task 11: Final verification and cleanup

**Step 1: Run full app test**

```bash
npm run dev
```

Test all pages with all three languages.

**Step 2: Run build to check for errors**

```bash
npm run build
```

Expected: Build succeeds without errors

**Step 3: Final commit**

```bash
git add .
git commit -m "feat(i18n): complete internationalization implementation"
```

**Step 4: Push changes**

```bash
git push
```

---

## Summary

After completing all tasks:
- App supports Dutch (nl), Spanish (es), and English (en)
- Language is auto-detected from browser on first visit
- User preference is saved in cookie
- Language selector in header allows manual switching
- All UI text is translated via next-intl
