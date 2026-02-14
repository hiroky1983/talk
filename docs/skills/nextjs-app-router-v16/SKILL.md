---
name: nextjs-app-router-v16
description: Next.js 16.1.6 App Router implementation and migration guidance based on the official Getting Started docs. Use when creating a new Next.js app, structuring routes/layouts, adding data fetching and server actions, configuring caching/revalidation, handling errors, styling, metadata, route handlers, proxy behavior, deployment, or upgrading to v16.
---

# Next.js App Router v16.1.6

Follow this workflow for any Next.js task.

1. Confirm the target is App Router and Next.js `16.1.6`.
2. Open `references/getting-started-v16.1.6.md` and use the relevant section only.
3. Apply official-first patterns from the reference before using custom abstractions.
4. Keep changes minimal and consistent with the existing codebase.
5. Validate by running project lint/tests/build commands when available.

## Implementation Rules

- Prefer React Server Components by default; add Client Components only when browser APIs, local interactivity, or client hooks are required.
- Use `Link` for navigation; use `useRouter` only for imperative navigation.
- Use Server Functions for mutations; pair mutations with `revalidatePath` or `revalidateTag` when cached data must refresh.
- Use `error.tsx`, `global-error.tsx`, and `not-found.tsx` for resilient error boundaries.
- Use Next.js primitives first: `next/image`, `next/font`, metadata API, route handlers, and proxy matcher config.
- For version changes, check the upgrade notes section in the reference and prefer codemods where available.

## Reference Loading Guide

- Read section `1-4` for initial app setup and routing structure.
- Read section `5-9` for data flow, caching, and error handling.
- Read section `10-14` for styling, images/fonts, and metadata.
- Read section `15-17` for API and deployment concerns.
- Read section `18` for migration work to v16.
