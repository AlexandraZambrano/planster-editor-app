import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CoverDesignerDialog } from "./cover-designer-dialog"
import { searchStockPhotos, getFeaturedStockPhotos, trackStockPhotoUsage } from "@/actions/cover-design"
import { updateBookCover } from "@/actions/books"

vi.mock("@/actions/cover-design", () => ({
  searchStockPhotos: vi.fn(),
  getFeaturedStockPhotos: vi.fn().mockResolvedValue({ photos: [] }),
  trackStockPhotoUsage: vi.fn(),
}))

vi.mock("@/actions/books", () => ({
  updateBookCover: vi.fn().mockResolvedValue({ success: true }),
}))

const BASE_PROPS = {
  open: true,
  onOpenChange: vi.fn(),
  bookTitle: "My Novel",
  onSave: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("CoverDesignerDialog", () => {
  it("renders with the book title as the default title text and the first preset selected", () => {
    render(<CoverDesignerDialog {...BASE_PROPS} />)
    expect(screen.getByDisplayValue("My Novel")).toBeInTheDocument()
    expect(screen.getByTestId("cover-bg-bg-1")).toBeInTheDocument()
  })

  it("pre-fills from initialDesign when editing an existing cover", () => {
    render(
      <CoverDesignerDialog
        {...BASE_PROPS}
        initialDesign={{
          backgroundType: "PRESET",
          backgroundValue: "bg-3",
          textLayers: [
            {
              id: "layer-1",
              text: "Custom Title",
              xPercent: 50,
              yPercent: 78,
              fontId: "oswald",
              color: "#000000",
              fontSize: 92,
            },
          ],
        }}
      />
    )
    expect(screen.getByDisplayValue("Custom Title")).toBeInTheDocument()
  })

  it("switches the selected font on click", async () => {
    render(<CoverDesignerDialog {...BASE_PROPS} />)
    const oswaldButton = screen.getByTestId("cover-font-oswald")
    await userEvent.click(oswaldButton)
    expect(oswaldButton.className).toContain("border-primary")
  })

  it("adds a new text layer directly onto the canvas", async () => {
    render(<CoverDesignerDialog {...BASE_PROPS} />)
    const before = screen.getAllByTestId(/^cover-layer-input-/).length

    await userEvent.click(screen.getByRole("button", { name: "+ Add text" }))

    expect(screen.getAllByTestId(/^cover-layer-input-/)).toHaveLength(before + 1)
    expect(screen.getByDisplayValue("Text")).toBeInTheDocument()
  })

  it("deletes the selected text layer", async () => {
    render(<CoverDesignerDialog {...BASE_PROPS} />)
    expect(screen.getByDisplayValue("My Novel")).toBeInTheDocument()

    await userEvent.click(screen.getByTestId("delete-layer-btn"))

    expect(screen.queryByDisplayValue("My Novel")).not.toBeInTheDocument()
    expect(screen.queryByTestId("layer-editor")).not.toBeInTheDocument()
  })

  it("saves the cover and calls onSave with the resulting URL and recipe", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ coverUrl: "https://res.cloudinary.com/demo/cover.jpg" }),
    }) as unknown as typeof fetch

    const onSave = vi.fn()
    const onOpenChange = vi.fn()
    render(<CoverDesignerDialog {...BASE_PROPS} onSave={onSave} onOpenChange={onOpenChange} />)

    await userEvent.click(screen.getByRole("button", { name: "Save cover" }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/cover-design", expect.objectContaining({ method: "POST" }))
    })

    const call = vi.mocked(global.fetch).mock.calls[0][1] as RequestInit
    const sentBody = JSON.parse(call.body as string)
    expect(sentBody.backgroundType).toBe("PRESET")
    expect(sentBody.backgroundValue).toBe("bg-1")
    expect(sentBody.textLayers).toHaveLength(1)
    expect(sentBody.textLayers[0].text).toBe("My Novel")
    expect(sentBody.textLayers[0].fontId).toBe("playfair-display")
    expect(sentBody.textLayers[0].color).toBe("#FFFFFF")

    expect(onSave).toHaveBeenCalledWith(
      "https://res.cloudinary.com/demo/cover.jpg",
      expect.objectContaining({ backgroundValue: "bg-1" })
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
    // No bookId (creating a new book) — nothing to persist yet, the
    // designer only hands the URL/recipe back to the surrounding form.
    expect(updateBookCover).not.toHaveBeenCalled()
  })

  it("persists the cover immediately when editing an existing book (bookId provided)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ coverUrl: "https://res.cloudinary.com/demo/cover.jpg" }),
    }) as unknown as typeof fetch

    const onSave = vi.fn()
    render(<CoverDesignerDialog {...BASE_PROPS} onSave={onSave} bookId="book-1" />)

    await userEvent.click(screen.getByRole("button", { name: "Save cover" }))

    await waitFor(() => {
      expect(updateBookCover).toHaveBeenCalledWith(
        "book-1",
        "https://res.cloudinary.com/demo/cover.jpg",
        expect.objectContaining({ backgroundValue: "bg-1" })
      )
    })
    expect(onSave).toHaveBeenCalled()
  })

  it("shows an error and keeps the dialog open when persisting the cover fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ coverUrl: "https://res.cloudinary.com/demo/cover.jpg" }),
    }) as unknown as typeof fetch
    vi.mocked(updateBookCover).mockResolvedValueOnce({ error: "Not found" })

    const onOpenChange = vi.fn()
    render(<CoverDesignerDialog {...BASE_PROPS} onOpenChange={onOpenChange} bookId="book-1" />)

    await userEvent.click(screen.getByRole("button", { name: "Save cover" }))

    expect(await screen.findByText("Not found")).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("shows an error and does not close when saving fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ error: "Failed to generate cover" }),
    }) as unknown as typeof fetch

    const onOpenChange = vi.fn()
    render(<CoverDesignerDialog {...BASE_PROPS} onOpenChange={onOpenChange} />)

    await userEvent.click(screen.getByRole("button", { name: "Save cover" }))

    expect(await screen.findByText("Failed to generate cover")).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("searches stock photos, selects one as the background, and tracks the Unsplash download ping", async () => {
    vi.mocked(searchStockPhotos).mockResolvedValue({
      photos: [
        {
          id: "42",
          thumbnailUrl: "https://images.unsplash.com/photo-42?w=400",
          fullUrl: "https://images.unsplash.com/photo-42?w=1080",
          photographerName: "Jane Doe",
          photographerUrl: "https://unsplash.com/@jane",
          sourceUrl: "https://unsplash.com/photos/42",
          downloadLocation: "https://api.unsplash.com/photos/42/download",
        },
      ],
    })

    render(<CoverDesignerDialog {...BASE_PROPS} />)

    await userEvent.click(screen.getByRole("tab", { name: "Photos" }))
    await userEvent.type(screen.getByTestId("stock-search-input"), "mountains")

    await waitFor(() => expect(searchStockPhotos).toHaveBeenCalledWith("mountains"), { timeout: 1000 })
    const photoButton = await screen.findByTestId("stock-photo-42")
    await userEvent.click(photoButton)

    expect(trackStockPhotoUsage).toHaveBeenCalledWith("https://api.unsplash.com/photos/42/download")
    expect(screen.getByTestId("photo-attribution")).toHaveTextContent("Photo by Jane Doe on Unsplash")
  })

  it("shows a featured photo gallery before the user searches, without calling the search endpoint", async () => {
    vi.mocked(getFeaturedStockPhotos).mockResolvedValue({
      photos: [
        {
          id: "99",
          thumbnailUrl: "https://images.unsplash.com/photo-99?w=400",
          fullUrl: "https://images.unsplash.com/photo-99?w=1080",
          photographerName: "Ansel Adams",
          photographerUrl: "https://unsplash.com/@ansel",
          sourceUrl: "https://unsplash.com/photos/99",
          downloadLocation: "https://api.unsplash.com/photos/99/download",
        },
      ],
    })

    render(<CoverDesignerDialog {...BASE_PROPS} />)
    expect(getFeaturedStockPhotos).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("tab", { name: "Photos" }))

    expect(await screen.findByTestId("stock-photo-99")).toBeInTheDocument()
    expect(screen.getByText("Featured photos")).toBeInTheDocument()
    expect(searchStockPhotos).not.toHaveBeenCalled()
  })
})
