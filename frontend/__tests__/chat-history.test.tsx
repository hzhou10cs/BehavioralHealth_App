import { render, screen } from "@testing-library/react";
import ChatHistoryPage from "@/pages/chat-history";
import * as api from "@/lib/api";

jest.mock("@/lib/api");

const mockedApi = api as jest.Mocked<typeof api>;

describe("ChatHistoryPage", () => {
  it("renders chat sessions from API", async () => {
    mockedApi.fetchChatHistory.mockResolvedValue([
      {
        id: "session-1",
        title: "Initial Intake Session",
        updatedAt: "2026-03-10T12:00:00.000Z"
      },
      {
        id: "session-2",
        title: "Weekly Follow-up",
        updatedAt: "2026-03-15T16:30:00.000Z"
      }
    ]);

    render(<ChatHistoryPage />);

    expect(await screen.findByText("Initial Intake Session")).toBeInTheDocument();
    expect(await screen.findByText("Weekly Follow-up")).toBeInTheDocument();
  });
});
