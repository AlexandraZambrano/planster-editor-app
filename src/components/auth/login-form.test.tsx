import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LoginForm } from "./login-form"
import { getEmailForIdentifier } from "@/actions/auth"

vi.mock("@/actions/auth", () => ({
  getEmailForIdentifier: vi.fn(),
}))

const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

const mockSignInWithPassword = vi.fn()
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: { signInWithPassword: mockSignInWithPassword },
  })),
}))

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders identifier and password fields", () => {
    render(<LoginForm />)
    expect(screen.getByTestId("identifier-input")).toBeInTheDocument()
    expect(screen.getByTestId("password-input")).toBeInTheDocument()
    expect(screen.getByTestId("submit-button")).toBeInTheDocument()
  })

  it("shows validation errors when submitting empty form", async () => {
    render(<LoginForm />)
    await userEvent.click(screen.getByTestId("submit-button"))

    await waitFor(() => {
      expect(screen.getByText("Enter your username or email")).toBeInTheDocument()
    })
  })

  it("resolves the identifier to an email before signing in", async () => {
    vi.mocked(getEmailForIdentifier).mockResolvedValueOnce({ email: "user@example.com" })
    mockSignInWithPassword.mockResolvedValueOnce({ error: null })

    render(<LoginForm />)
    await userEvent.type(screen.getByTestId("identifier-input"), "user@example.com")
    await userEvent.type(screen.getByTestId("password-input"), "password123")
    await userEvent.click(screen.getByTestId("submit-button"))

    await waitFor(() => {
      expect(getEmailForIdentifier).toHaveBeenCalledWith("user@example.com")
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      })
    })
  })

  it("accepts a username instead of an email", async () => {
    vi.mocked(getEmailForIdentifier).mockResolvedValueOnce({ email: "resolved@example.com" })
    mockSignInWithPassword.mockResolvedValueOnce({ error: null })

    render(<LoginForm />)
    await userEvent.type(screen.getByTestId("identifier-input"), "someusername")
    await userEvent.type(screen.getByTestId("password-input"), "password123")
    await userEvent.click(screen.getByTestId("submit-button"))

    await waitFor(() => {
      expect(getEmailForIdentifier).toHaveBeenCalledWith("someusername")
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "resolved@example.com",
        password: "password123",
      })
    })
  })

  it("shows error message when the identifier cannot be resolved", async () => {
    vi.mocked(getEmailForIdentifier).mockResolvedValueOnce({
      error: "Invalid username/email or password",
    })

    render(<LoginForm />)
    await userEvent.type(screen.getByTestId("identifier-input"), "unknownuser")
    await userEvent.type(screen.getByTestId("password-input"), "password123")
    await userEvent.click(screen.getByTestId("submit-button"))

    await waitFor(() => {
      expect(screen.getByText("Invalid username/email or password")).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("shows error message on invalid credentials", async () => {
    vi.mocked(getEmailForIdentifier).mockResolvedValueOnce({ email: "user@example.com" })
    mockSignInWithPassword.mockResolvedValueOnce({ error: { message: "Invalid login credentials" } })

    render(<LoginForm />)
    await userEvent.type(screen.getByTestId("identifier-input"), "user@example.com")
    await userEvent.type(screen.getByTestId("password-input"), "wrongpassword")
    await userEvent.click(screen.getByTestId("submit-button"))

    await waitFor(() => {
      expect(screen.getByText("Invalid username/email or password")).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("redirects to /write on successful login", async () => {
    vi.mocked(getEmailForIdentifier).mockResolvedValueOnce({ email: "user@example.com" })
    mockSignInWithPassword.mockResolvedValueOnce({ error: null })

    render(<LoginForm />)
    await userEvent.type(screen.getByTestId("identifier-input"), "user@example.com")
    await userEvent.type(screen.getByTestId("password-input"), "password123")
    await userEvent.click(screen.getByTestId("submit-button"))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/write")
    })
  })
})
