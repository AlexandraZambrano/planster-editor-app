import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { usePathname } from "next/navigation"
import { FooterGate } from "./footer-gate"

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }))

describe("FooterGate", () => {
  it.each(["/", "/explore", "/books/abc", "/messages", "/write/b1/studio/characters"])(
    "shows the footer on %s",
    (path) => {
      vi.mocked(usePathname).mockReturnValue(path)
      render(<FooterGate><footer>f</footer></FooterGate>)
      expect(screen.getByText("f")).toBeInTheDocument()
    }
  )

  it.each(["/write/b1/editor/c1", "/read/b1/c1", "/write/b1/studio/board", "/write/b1/studio/notes", "/messages/conv1"])(
    "hides the footer on full-screen tool %s",
    (path) => {
      vi.mocked(usePathname).mockReturnValue(path)
      render(<FooterGate><footer>f</footer></FooterGate>)
      expect(screen.queryByText("f")).not.toBeInTheDocument()
    }
  )
})
