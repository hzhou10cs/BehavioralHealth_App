import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatPage from "@/pages/chat";
import * as api from "@/lib/api";

jest.mock("@/lib/api");

const mockedApi = api as jest.Mocked<typeof api>;

describe("ChatPage", () => {
  it("loads messages and sends a new message", async () => {
    mockedApi.fetchMessages.mockResolvedValue([
      {
        id: "1",
        role: "assistant",
        text: "How are you feeling today?"
      }
    ]);
    mockedApi.sendMessage.mockResolvedValue({
      id: "2",
      role: "user",
      text: "I am feeling better."
    });

    render(<ChatPage />);

    expect(
      await screen.findByText("How are you feeling today?")
    ).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Message"), "I am feeling better.");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(mockedApi.sendMessage).toHaveBeenCalledWith("I am feeling better.");
    });
    expect(await screen.findByText("I am feeling better.")).toBeInTheDocument();
  });
});
