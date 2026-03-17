import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/pages/login";
import * as api from "@/lib/api";

jest.mock("@/lib/api");

const mockedApi = api as jest.Mocked<typeof api>;

describe("LoginPage", () => {
  it("submits credentials and displays welcome state", async () => {
    mockedApi.login.mockResolvedValue({
      token: "mock-token",
      userName: "Jordan"
    });

    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email"), "jordan@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Log In" }));

    expect(mockedApi.login).toHaveBeenCalledWith({
      email: "jordan@example.com",
      password: "secret123"
    });

    expect(await screen.findByText("Welcome, Jordan")).toBeInTheDocument();
  });
});
