import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { StarRating } from "./star-rating"

describe("StarRating (interactive)", () => {
  it("is a single slider announcing the current value", () => {
    render(<StarRating value={3.5} onChange={vi.fn()} />)
    const slider = screen.getByRole("slider")
    expect(slider).toHaveAttribute("aria-valuenow", "3.5")
    expect(screen.queryAllByRole("button")).toHaveLength(0)
  })

  it("steps by half stars with the keyboard and clamps to 0.5–5", () => {
    const onChange = vi.fn()
    const { rerender } = render(<StarRating value={3} onChange={onChange} />)
    const slider = screen.getByRole("slider")

    fireEvent.keyDown(slider, { key: "ArrowRight" })
    expect(onChange).toHaveBeenLastCalledWith(3.5)
    fireEvent.keyDown(slider, { key: "ArrowLeft" })
    expect(onChange).toHaveBeenLastCalledWith(2.5)
    fireEvent.keyDown(slider, { key: "End" })
    expect(onChange).toHaveBeenLastCalledWith(5)

    rerender(<StarRating value={5} onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowUp" })
    expect(onChange).toHaveBeenLastCalledWith(5)

    rerender(<StarRating value={null} onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" })
    expect(onChange).toHaveBeenLastCalledWith(0.5)
  })

  it("maps a click position to the nearest half star", () => {
    const onChange = vi.fn()
    render(<StarRating value={null} onChange={onChange} />)
    const slider = screen.getByRole("slider")
    slider.getBoundingClientRect = () => ({ left: 0, width: 100 }) as DOMRect

    fireEvent.click(slider, { clientX: 1 }) // first half of star 1
    expect(onChange).toHaveBeenLastCalledWith(0.5)
    fireEvent.click(slider, { clientX: 35 }) // second half of star 2
    expect(onChange).toHaveBeenLastCalledWith(2)
    fireEvent.click(slider, { clientX: 100 })
    expect(onChange).toHaveBeenLastCalledWith(5)
  })

  it("is not focusable when read-only", () => {
    render(<StarRating value={4} readOnly />)
    expect(screen.queryByRole("slider")).not.toBeInTheDocument()
    expect(screen.getByText("4.0")).toBeInTheDocument()
  })
})
