"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Registering a service worker in dev interferes with Next.js's HMR/Fast
    // Refresh (it intercepts navigations mid-recompile) — production only.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability/offline support degrades gracefully if this fails.
      })
    }
  }, [])

  return null
}
