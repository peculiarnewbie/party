# AGENTS.md

This document provides guidelines for agentic coding agents operating in this repository.

## Project Overview

This is a TanStack Solid Start application with Cloudflare Workers deployment. It uses TypeScript, Tailwind CSS, and Vite.

## Build Commands

```bash
# Install dependencies
bun i

# Start development server
bun dev

# Build for production (runs TypeScript check)
bun build

# Preview production build
bun preview

# Deploy to Cloudflare
bun run deploy

# Generate Cloudflare types
bun run cf-typegen
```

**Important**: `bun build` runs `vite build && tsc --noEmit` to validate TypeScript.

## TypeScript Configuration

- **Strict mode enabled** in `tsconfig.json`
- **Path alias**: Use `~/*` to import from `./src/*` (e.g., `~/components/Button`)
- **Target**: ES2022
- **Module**: ESNext with Bundler resolution
- **JSX**: preserve with solid-js import source

## Code Style Guidelines

### Imports

```tsx
// External packages
import { createRouter } from "@tanstack/solid-router";

// Path aliases (use ~/*)
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import appCss from "~/styles/app.css?url";

// Type imports
import type { ErrorComponentProps } from "@tanstack/solid-router";
```

- Use named imports from `@tanstack/solid-router` for routes, components, and utilities
- Import CSS with `?url` suffix for Vite
- Place type imports after regular imports

### File Naming

- **Routes**: Use `route.tsx` pattern inside `src/routes/` directories
- **Components**: kebab-case (e.g., `default-catch-boundary.tsx`)
- **Utilities**: kebab-case (e.g., `logging-middleware.tsx`)
- **Configuration**: kebab-case (e.g., `vite.config.ts`)

### Creating New Routes

When creating new routes, keep the dev server running (`bun dev`). TanStack Router will automatically detect new route files and add the necessary boilerplate to `routeTree.gen.ts`.

### Component Patterns

```tsx
import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/posts/")({
    component: PostsIndexComponent,
});

function PostsIndexComponent() {
    return <div>Content</div>;
}
```

- Use `createFileRoute` for file-based routing in `src/routes/`
- Export `Route` as named export
- Component functions are named PascalCase

### Error Handling

```tsx
// Use DefaultCatchBoundary for route-level errors
export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
    const router = useRouter();
    console.error("Error:", error);
    return <ErrorComponent error={error} />;
}
```

- Use `DefaultCatchBoundary` for catching route errors
- Log errors with `console.error` for debugging
- Return `ErrorComponent` with the error prop

### Middleware

```tsx
import { createMiddleware } from "@tanstack/solid-start";

const preLogMiddleware = createMiddleware({ type: "function" })
    .client(async (ctx) => {
        return ctx.next({
            context: {
                /* data */
            },
        });
    })
    .server(async (ctx) => {
        return ctx.next({
            sendContext: {
                /* data */
            },
        });
    });
```

- Use `createMiddleware` from `@tanstack/solid-start`
- Chain `.client()` and `.server()` for client/server-specific logic
- Use `context` and `sendContext` to pass data between middleware stages

### Tailwind CSS

- Use utility classes for styling
- Class names use kebab-case (e.g., `class="flex gap-2 items-center"`)
- No custom CSS files unless necessary (use Tailwind primarily)

### TypeScript Types

- Enable strict TypeScript checking
- Use explicit types for props and function parameters
- Import types with `import type` when possible
- Use Zod for runtime validation (zod is installed)

### Naming Conventions

| Pattern          | Convention           | Example                      |
| ---------------- | -------------------- | ---------------------------- |
| Components       | PascalCase           | `DefaultCatchBoundary`       |
| Functions        | camelCase            | `getRouter()`                |
| Constants        | SCREAMING_SNAKE_CASE | `MAX_RETRIES`                |
| Types/Interfaces | PascalCase           | `ErrorComponentProps`        |
| Files (all)      | kebab-case           | `default-catch-boundary.tsx` |

### Directory Structure

```
src/
├── components/     # Reusable UI components
├── routes/         # File-based routes (TanStack Router)
├── utils/          # Utility functions and hooks
├── styles/         # Global styles
├── game/           # Game logic
├── worker/         # WebSocket/worker code
└── router.tsx      # Router configuration
```

### Cloudflare Workers

- Access bindings via `import { env } from 'cloudflare:workers'` in server code
- Server functions can use Cloudflare bindings directly
- Run `bun run cf-typegen` after adding new bindings

### Git Workflow

- Do not commit changes unless explicitly requested
- Never use `git push --force` or hard resets
- Avoid `git commit --amend` after pushing
- Create meaningful commit messages focused on "why" not just "what"

### General Rules

- Do not add comments unless explicitly requested
- Avoid emojis in code and commits
- Use TypeScript over plain JavaScript
- Prefer functional components and hooks
- Handle errors gracefully with proper boundary components
- Follow existing patterns in the codebase
