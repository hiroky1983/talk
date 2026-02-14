# Next.js Getting Started Reference (v16.1.6)

Source index: [Getting Started](https://nextjs.org/docs/app/getting-started)
Version target: `16.1.6` (App Router docs)

## 1. Installation

Source: [Installation](https://nextjs.org/docs/app/getting-started/installation)

- Start with `create-next-app@latest`; it scaffolds TypeScript, ESLint, Tailwind, and App Router options.
- Use Node.js `20.9+` or `22.0+` for current requirements.
- Development server is `next dev`; production is `next build` then `next start`.
- Prefer editing `app/page.tsx` first to verify bootstrap flow.

## 2. Project Structure

Source: [Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)

- Route segments map from folders under `app/`.
- Common files: `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`.
- Route groups `(group)` and private folders `_folder` help organize without changing URL paths.
- Dynamic segments use `[slug]`, catch-all `[...slug]`, optional catch-all `[[...slug]]`.

## 3. Layouts and Pages

Source: [Layouts and Pages](https://nextjs.org/docs/app/getting-started/layouts-and-pages)

- `page.tsx` defines a unique route UI.
- `layout.tsx` defines shared UI around children and persists across navigation.
- Root layout in `app/layout.tsx` is required.
- Nested layouts compose section-level shells.

## 4. Linking and Navigating

Source: [Linking and Navigating](https://nextjs.org/docs/app/getting-started/linking-and-navigating)

- Use `next/link` for client transitions and prefetch behavior.
- Use `useRouter` from `next/navigation` for imperative operations.
- Use native History API integrations where appropriate for lightweight URL changes.
- Avoid full page reloads for in-app navigation.

## 5. Server and Client Components

Source: [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

- Server Components are default in App Router.
- Add `"use client"` only when client interactivity or browser APIs are required.
- Keep Client Components narrow to reduce bundle size.
- Pass serializable props from server to client boundaries.

## 6. Cache Components

Source: [Cache Components](https://nextjs.org/docs/app/getting-started/cache-components)

- Cache Components combine static and dynamic rendering using Suspense boundaries.
- Use `use cache` to mark cacheable data/functions/components.
- Use `cacheLife` and `cacheTag` to tune freshness and invalidation strategy.
- Keep user-specific/sensitive work out of shared caches.

## 7. Fetching Data

Source: [Fetching Data](https://nextjs.org/docs/app/getting-started/fetching-data)

- Fetch in Server Components when possible.
- Use route handlers for backend-only data endpoints when needed.
- Use streaming + Suspense for slow async regions.
- Use `use` in Client Components only when consuming server-started promises.

## 8. Updating Data

Source: [Updating Data](https://nextjs.org/docs/app/getting-started/updating-data)

- Perform mutations with Server Functions (`"use server"`).
- Forms can call Server Functions directly for progressive enhancement.
- Pair mutation paths with cache revalidation.
- Use `useActionState` and pending UI states for robust UX.

## 9. Caching and Revalidating

Source: [Caching and Revalidating](https://nextjs.org/docs/app/getting-started/caching-and-revalidating)

- Understand cache scopes: request memoization, Data Cache, router cache.
- Use `revalidatePath` for route-level refresh.
- Use `revalidateTag` with `cacheTag` for entity/tag-level refresh.
- Time-based expiry can be tuned with `cacheLife`.

## 10. Error Handling

Source: [Error Handling](https://nextjs.org/docs/app/getting-started/error-handling)

- Use `error.tsx` for segment-level boundary and recovery UI.
- Use `global-error.tsx` for app-wide fallback.
- Use `not-found.tsx` for 404 flows with `notFound()`.
- Use redirect patterns intentionally; do not hide unexpected failures.

## 11. CSS

Source: [CSS](https://nextjs.org/docs/app/getting-started/css)

- Global CSS loads from root layout.
- Use CSS Modules for component-scoped styles.
- Tailwind CSS integration is first-class.
- Sass and CSS-in-JS options remain supported with framework constraints.

## 12. Images and Fonts

Source: [Images and Fonts](https://nextjs.org/docs/app/getting-started/images-and-fonts)

- Use `next/image` for optimized loading, sizing, and formats.
- Configure remote image patterns explicitly for external domains.
- Use `next/font` (`google` or `local`) for self-hosted, optimized font delivery.
- Apply fonts via className or CSS variable patterns.

## 13. Metadata and OG Images

Source: [Metadata and OG Images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)

- Static metadata via exported `metadata` object.
- Dynamic metadata via `generateMetadata`.
- File-based metadata conventions include favicon and OG/Twitter assets.
- Dynamic OG image generation can use `ImageResponse`.

## 14. Route Handlers and Middleware

Source: [Route Handlers and Middleware](https://nextjs.org/docs/app/getting-started/route-handlers-and-middleware)

- Use `route.ts` for server endpoints under App Router segments.
- Access request data via Web `Request`/`Response` APIs.
- Apply CORS and headers in handlers when required.
- Use proxy/middleware only for cross-cutting request logic.

## 15. Proxy

Source: [Proxy](https://nextjs.org/docs/app/getting-started/proxy)

- Define proxy behavior in `proxy.ts` for request interception patterns.
- Scope execution with `matcher` to avoid unnecessary work.
- Handle auth/session/redirect checks as close to edge logic as possible.
- Keep proxy logic minimal and deterministic.

## 16. Deploying

Source: [Deploying](https://nextjs.org/docs/app/getting-started/deploying)

- Vercel is the default deployment target with zero-config support.
- Self-hosting is supported; ensure Node/runtime parity with local build.
- Validate `next build` output and runtime env vars before release.
- Evaluate static export vs server runtime based on feature needs.

## 17. Upgrading

Source: [Upgrading](https://nextjs.org/docs/app/getting-started/upgrading)

- Read version-specific migration notes before bumping major versions.
- Prefer official codemods to reduce manual migration risk.
- Validate deprecated APIs (routing, metadata, image, caching-related changes).
- Re-run lint/tests/build after migration and inspect runtime warnings.

## 18. Create Next App

Source: [Create Next App](https://nextjs.org/docs/app/getting-started/create-next-app)

- Scaffolding defaults are optimized for App Router onboarding.
- Start with defaults unless project constraints require opt-out.
- Keep generated conventions until concrete reasons to diverge appear.
- Treat generated examples as baseline for repo standards.
