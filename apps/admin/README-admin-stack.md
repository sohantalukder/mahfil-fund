## Admin UI stack conventions

- **UI library**: Local `shadcn`-style components live under `src/app/components/ui` (e.g. `skeleton.tsx`, `card.tsx`) and rely on Tailwind utility classes.
- **Styling**: Tailwind is configured via `tailwind.config.ts` and `postcss.config.mjs`. Legacy CSS in `src/app/globals.css` remains valid and can coexist with Tailwind utilities.
- **Data fetching**: All API calls in the admin app should use **TanStack Query**:
  - For queries that call the Mahfil API, prefer the `useApiQuery` helper in `src/lib/query.ts`.
  - For mutations, use `useMutation` from `@tanstack/react-query` and invalidate related query keys.
- **Providers**:
  - `src/app/providers.tsx` wraps the tree in `QueryClientProvider`, i18n, theme, and toast providers.
  - Use `useTheme` from `providers.tsx` for theme toggles.
- **Loading states**:
  - Use shimmer/skeleton loaders for all non-trivial data loads.
  - Reuse `Skeleton` from `src/app/components/ui/skeleton.tsx` and prefer table/card skeletons over spinners.

