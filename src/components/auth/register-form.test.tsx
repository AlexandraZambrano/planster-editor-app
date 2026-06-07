import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { signIn } from "next-auth/react"
import type { SignInResponse } from "next-auth/react"
import { RegisterForm } from "./register-form"
import * as authActions from "@/actions/auth"

vi.mock("@/actions/auth", () => ({
  registerUser: vi.fn(),
}))

const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

async function fillForm(overrides: Partial<Record<string, string>> = {}) {
  const values = {
    email: "new@example.com",
    displayName: "New User",
    username: "newuser",
    password: "password123",
    ...overrides,
  }
  await userEvent.type(screen.getByTestId("email-input"), values.email)
  await userEvent.type(screen.getByTestId("display-name-input"), values.displayName)
  await userEvent.type(screen.getByTestId("username-input"), values.username)
  await userEvent.type(screen.getByTestId("password-input"), values.password)
}

describe("RegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders all required fields", () => {
    render(<RegisterForm />)
    expect(screen.getByTestId("email-input")).toBeInTheDocument()
    expect(screen.getByTestId("display-name-input")).toBeInTheDocument()
    expect(screen.getByTestId("username-input")).toBeInTheDocument()
    expect(screen.getByTestId("password-input")).toBeInTheDocument()
    expect(screen.getByTestId("submit-button")).toBeInTheDocument()
  })

  it("shows validation error for short password", async () => {
    render(<RegisterForm />)
    await fillForm({ password: "short" })
    await userEvent.click(screen.getByTestId("submit-button"))

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument()
    })
  })

  it("shows validation error for invalid username characters", async () => {
    render(<RegisterForm />)
    await fillForm({ username: "invalid user!" })
    await userEvent.click(screen.getByTestId("submit-button"))

    await waitFor(() => {
      expect(screen.getByText("Only letters, numbers, and underscores allowed")).toBeInTheDocument()
    })
  })

  it("shows server error when registration fails", async () => {
    vi.mocked(authActions.registerUser).mockResolvedValueOnce({
      error: "This email is already registered",
    })

    render(<RegisterForm />)
    await fillForm()
    await userEvent.click(screen.getByTestId("submit-button"))

    await waitFor(() => {
      expect(screen.getByText("This email is already registered")).toBeInTheDocument()
    })
    expect(signIn).not.toHaveBeenCalled()
  })

  it("calls registerUser then signIn then redirects on success", async () => {
    vi.mocked(authActions.registerUser).mockResolvedValueOnce({ success: true })
    vi.mocked(signIn).mockResolvedValueOnce({ error: undefined, code: undefined, ok: true, status: 200, url: null } as SignInResponse)

    render(<RegisterForm />)
    await fillForm()
    await userEvent.click(screen.getByTestId("submit-button"))

    await waitFor(() => {
      expect(authActions.registerUser).toHaveBeenCalledWith({
        email: "new@example.com",
        displayName: "New User",
        username: "newuser",
        password: "password123",
      })
      expect(signIn).toHaveBeenCalledWith("credentials", {
        email: "new@example.com",
        password: "password123",
        redirect: false,
      })
      expect(mockPush).toHaveBeenCalledWith("/write")
    })
  })
})
