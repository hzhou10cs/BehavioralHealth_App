const React = require("react");
const TestRenderer = require("react-test-renderer");
const { act } = TestRenderer;
const { Text, TextInput } = require("react-native");

const App = require("../App").default;
const { resetClientStateForTests } = require("../lib/api");
const { formatMessageTimestamp } = require("../lib/formatMessageTimestamp");

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
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("logs in, sends a message through the backend flow, and updates chat and history UI", async () => {
    const fetchMock = global.fetch;

    let conversationCreated = false;
    let sessionEnded = false;

    fetchMock.mockImplementation((url, init = {}) => {
      const method = (init.method || "GET").toUpperCase();
      const path = String(url).replace("http://127.0.0.1:8000", "");

      if (path === "/auth/login" && method === "POST") {
        return Promise.resolve(
          createResponse({
            json: {
              access_token: "development-token",
              token_type: "bearer",
              user_name: "alex",
              tutorial_required: false
            }
          })
        );
      }

      if (path === "/lessons" && method === "GET") {
        return Promise.resolve(
          createResponse({
            json: [
              {
                id: "lesson-01",
                week: 1,
                slug: "welcome",
                title: "Welcome",
                phase: "onboarding",
                summary: "Program overview and participant expectations.",
                status: "in_progress"
              }
            ]
          })
        );
      }

      if (path === "/conversations" && method === "GET") {
        if (conversationCreated && !sessionEnded) {
          return Promise.resolve(
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
        }
        return Promise.resolve(createResponse({ json: [] }));
      }

      if (path === "/conversations" && method === "POST") {
        conversationCreated = true;
        sessionEnded = false;
        return Promise.resolve(
          createResponse({
            status: 201,
            json: {
              id: "conv-1",
              title: "alex's Session",
              created_at: "2026-03-24T18:00:00.000Z",
              updated_at: "2026-03-24T18:00:00.000Z"
            }
          })
        );
      }

      if (path === "/conversations/conv-1/messages" && method === "POST") {
        return Promise.resolve(
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
        );
      }

      if (path === "/conversations/conv-1/assistant-reply" && method === "POST") {
        return Promise.resolve(
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
        );
      }

      if (path === "/conversations/conv-1/history" && method === "GET") {
        return Promise.resolve(
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
        );
      }

      if (path === "/conversations/conv-1/end-session" && method === "POST") {
        sessionEnded = true;
        return Promise.resolve(
          createResponse({
            json: {
              conversation_id: "conv-1",
              report:
                "Session Stage Report - Session conv-1\nSession with details:\nSummary text"
            }
          })
        );
      }

      if (path === "/conversations/completed" && method === "GET") {
        if (!sessionEnded) {
          return Promise.resolve(createResponse({ json: [] }));
        }
        return Promise.resolve(
          createResponse({
            json: [
              {
                id: "conv-1",
                title: "alex's Session",
                created_at: "2026-03-24T18:00:00.000Z",
                updated_at: "2026-03-24T18:10:00.000Z",
                lesson_number: 1
              }
            ]
          })
        );
      }

      return Promise.resolve(
        createResponse({
          ok: false,
          status: 404,
          json: { detail: `Unhandled mock route: ${method} ${path}` },
        })
      );
    });

    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(App));
    });

    const root = renderer.root;
    const [emailInput, passwordInput] = root.findAllByType(TextInput);

    await act(async () => {
      emailInput.props.onChangeText("alex@example.com");
      passwordInput.props.onChangeText("password123");
    });
    await flushPromises();

    await act(async () => {
      root.findByProps({ accessibilityLabel: "Log In" }).props.onPress();
    });
    await flushPromises();

    expect(getTextValues(root)).toContain("Hello, alex");

    await act(async () => {
      root.findByProps({ accessibilityLabel: "Open Lessons" }).props.onPress();
    });
    await flushPromises();

    expect(getTextValues(root)).toContain("Lesson 1: Welcome");

    await act(async () => {
      root.findByProps({ accessibilityLabel: "Back" }).props.onPress();
    });
    await flushPromises();

    await act(async () => {
      root.findByProps({ accessibilityLabel: "New Session" }).props.onPress();
    });
    await flushPromises();

    expect(getTextValues(root)).toContain("Active Chat (alex)");

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
    expect(chatTexts).toContain(formatMessageTimestamp("2026-03-24T18:01:00.000Z"));

    await act(async () => {
      root.findByProps({ accessibilityLabel: "End Conversation" }).props.onPress();
    });
    await flushPromises();

    const summaryTexts = getTextValues(root);
    expect(summaryTexts).toContain("-- Summary of current session --");
    expect(summaryTexts).toContain("--END--");
    expect(
      summaryTexts.some(
        (value) =>
          typeof value === "string" &&
          value.includes("Session Stage Report - Session conv-1")
      )
    ).toBe(true);

    await act(async () => {
      root.findByProps({ accessibilityLabel: "Back" }).props.onPress();
    });
    await flushPromises();

    expect(getTextValues(root)).toContain("Hello, alex");

    await act(async () => {
      root.findByProps({ accessibilityLabel: "Session History" }).props.onPress();
    });
    await flushPromises();

    expect(getTextValues(root)).toContain("Session 1");

    await act(async () => {
      root.findByProps({ accessibilityLabel: "Open history for Session 1" }).props.onPress();
    });
    await flushPromises();

    const historyTexts = getTextValues(root);
    expect(historyTexts).toContain("Conversation History");
    expect(historyTexts).toContain("I feel overwhelmed.");
    expect(historyTexts).toContain(formatMessageTimestamp("2026-03-24T18:01:00.000Z"));
    expect(root.findAllByProps({ accessibilityLabel: "Send" })).toHaveLength(0);
  });
});
