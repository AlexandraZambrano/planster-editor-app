"use client"

import { usePathname } from "next/navigation"

// Full-screen tools (editor, reader, board, notes, chat) own the whole viewport;
// a marketing footer under them only adds a confusing extra scroll.
const IMMERSIVE = [/\/editor\//, /^\/read\//, /\/studio\/(board|notes)$/, /^\/messages\/.+/]

export function FooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return IMMERSIVE.some((re) => re.test(pathname)) ? null : children
}
