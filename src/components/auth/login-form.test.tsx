import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { signIn } from "next-auth/react"
import type { SignInResponse } from "next-auth/react"
import { LoginForm } from "./login-form"

const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

function mockSignInSuccess(): SignInResponse {
  return { error: undefined, code: undefined, ok: true, status: 200, url: null }
}

function mockSignInFailure(): SignInResponse {
  return { error: "CredentialsSignin", code: "credentials", ok: false, status: 401, url: null }
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders email and password fields", () => {
    render(<LoginForm />)
    expect(screen.getByTestId("email-input")).toBeInTheDocument()
    expect(screen.getByTestId("password-input")).toBeInTheDocument()
    expect(screen.getByTestId("submit-button")).toBeInTheDocument()
  })

  it("shows validation errors when submitting empty form", async () => {
    render(<LoginForm />)
    await userEvent.click(screen.getByTestId("submit-button"))

    await waitFor(() => {
      expect(screen.getByText("Enter a valid email")).toBeInTheDocument()
    })
  })

  it("calls signIn with credentials on valid submit", async () => {
    vi.mocked(signIn).mockResolvedValueOnce(mockSignInSuccess())

    render(<LoginForm />)
    await userEvent.type(screen.getByTestId("email-input"), "user@example.com")
    await userEvent.type(screen.getByTestId("password-input"), "password123")
    await userEvent.click(screen.getByTestId("submit-button"))

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("credentials", {
        email: "user@example.com",
        password: "password123",
        redirect: false,
      })
    })
  })

  it("shows error message on invalid credentials", async () => {
    vi.mocked(signIn).mockResolvedValueOnce(mockSignInFailure())

    render(<LoginForm />)
    await userEvent.type(screen.getByTestId("email-input"), "user@example.com")
    await userEvent.type(screen.getByTestId("password-input"), "wrongpassword")
    await userEvent.click(screen.getByTestId("submit-button"))

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password")).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("redirects to /write on successful login", async () => {
    vi.mocked(signIn).mockResolvedValueOnce(mockSignInSuccess())

    render(<LoginForm />)
    await userEvent.type(screen.getByTestId("email-input"), "user@example.com")
    await userEvent.type(screen.getByTestId("password-input"), "password123")
    await userEvent.click(screen.getByTestId("submit-button"))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/write")
    })
  })
})
