import { SiteNav } from "@/components/shared/site-nav"

// Studio pages are deep inside the writer flow — keep the main nav reachable from all of them
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav active="write" />
      {children}
    </>
  )
}
