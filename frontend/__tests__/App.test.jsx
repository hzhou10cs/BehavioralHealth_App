const React = require("react");
const TestRenderer = require("react-test-renderer");
const { act } = TestRenderer;
const { Text, TextInput } = require("react-native");

const App = require("../App").default;
const { resetClientStateForTests } = require("../lib/api");

function createResponse({ ok = true, status = 200, json }) {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(json)
  };
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

function getTextValues(root) {
  return root.findAllByType(Text).flatMap((node) => {
    const children = node.props.children;
    return Array.isArray(children) ? children : [children];
  });
}

describe("App integration", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    global.fetch = jest.fn();
    resetClientStateForTests();
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("logs in, sends a message through the backend flow, and updates chat and history UI", async () => {
    const fetchMock = global.fetch;
    fetchMock
      .mockResolvedValueOnce(
        createResponse({
          json: {
            access_token: "development-token",
            token_type: "bearer",
            user_name: "alex"
          }
        })
      )
      .mockResolvedValueOnce(createResponse({ json: [] }))
      .mockResolvedValueOnce(createResponse({ json: [] }))
      .mockResolvedValueOnce(
        createResponse({
          status: 201,
          json: {
            id: "conv-1",
            title: "alex's Session",
            created_at: "2026-03-24T18:00:00.000Z",
            updated_at: "2026-03-24T18:00:00.000Z"
          }
        })
      )
      .mockResolvedValueOnce(
        createResponse({
          status: 201,
          json: {
            id: "msg-1",
            conversation_id: "conv-1",
            role: "user",
            content: "I feel overwhelmed.",
            created_at: "2026-03-24T18:01:00.000Z"
          }
        })
      )
      .mockResolvedValueOnce(
        createResponse({
          status: 201,
          json: {
            id: "msg-2",
            conversation_id: "conv-1",
            role: "assistant",
            content: "Thanks for sharing that. I hear you saying: 'I feel overwhelmed.'.",
            created_at: "2026-03-24T18:01:10.000Z"
          }
        })
      )
      .mockResolvedValueOnce(
        createResponse({
          json: [
            {
              id: "msg-1",
              conversation_id: "conv-1",
              role: "user",
              content: "I feel overwhelmed.",
              created_at: "2026-03-24T18:01:00.000Z"
            },
            {
              id: "msg-2",
              conversation_id: "conv-1",
              role: "assistant",
              content: "Thanks for sharing that. I hear you saying: 'I feel overwhelmed.'.",
              created_at: "2026-03-24T18:01:10.000Z"
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        createResponse({
          json: [
            {
              id: "conv-1",
              title: "alex's Session",
              created_at: "2026-03-24T18:00:00.000Z",
              updated_at: "2026-03-24T18:01:10.000Z"
            }
          ]
        })
      );

    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(App));
    });

    const root = renderer.root;
    const [emailInput, passwordInput] = root.findAllByType(TextInput);

    await act(async () => {
      emailInput.props.onChangeText("alex@example.com");
      passwordInput.props.onChangeText("password123");
      root.findByProps({ accessibilityLabel: "Log In" }).props.onPress();
    });
    await flushPromises();

    expect(getTextValues(root)).toContain("Therapy Chat (alex)");

    await act(async () => {
      root.findByProps({ accessibilityLabel: "Message" }).props.onChangeText("I feel overwhelmed.");
    });
    await flushPromises();

    await act(async () => {
      root.findByProps({ accessibilityLabel: "Send" }).props.onPress();
    });
    await flushPromises();

    const chatTexts = getTextValues(root);
    expect(chatTexts).toContain("I feel overwhelmed.");
    expect(
      chatTexts.some(
        (value) =>
          typeof value === "string" &&
          value.includes("Thanks for sharing that. I hear you saying")
      )
    ).toBe(true);

    await act(async () => {
      root.findByProps({ accessibilityLabel: "History" }).props.onPress();
    });
    await flushPromises();

    expect(getTextValues(root)).toContain("alex's Session");
  });
});
