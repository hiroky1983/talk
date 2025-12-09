import { ReactNode } from 'react'

// Since we have a [locale] directory that handles the layout with html/body tags,
// this root layout simply passes children through.
// It is required by Next.js App Router for the root path.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
