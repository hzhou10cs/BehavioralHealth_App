import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "@/components/Button";
import MessageBubble from "@/components/MessageBubble";

describe("Reusable components", () => {
  it("Button supports click handlers", async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Continue</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("MessageBubble renders role and content", () => {
    render(
      <ul>
        <MessageBubble
          message={{ id: "1", role: "assistant", text: "Let's practice grounding." }}
        />
      </ul>
    );

    expect(screen.getByLabelText("assistant-message")).toBeInTheDocument();
    expect(screen.getByText("Let's practice grounding.")).toBeInTheDocument();
  });
});
