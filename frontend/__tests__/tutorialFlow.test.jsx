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

describe("tutorial flow", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    global.fetch = jest.fn();
    resetClientStateForTests();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("replays the tutorial from home and shows the skip confirmation", async () => {
    global.fetch
      .mockResolvedValueOnce(
        createResponse({
          json: {
            access_token: "development-token",
            token_type: "bearer",
            user_name: "alex",
            tutorial_required: false
          }
        })
      )
      .mockResolvedValueOnce(
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

    await act(async () => {
      root.findByProps({ accessibilityLabel: "Replay tutorial" }).props.onPress();
    });
    await flushPromises();

    expect(() =>
      root.findByProps({ accessibilityLabel: "Next tutorial step" })
    ).not.toThrow();

    await act(async () => {
      root.findByProps({ accessibilityLabel: "Skip tutorial" }).props.onPress();
    });
    await flushPromises();

    expect(() =>
      root.findByProps({ accessibilityLabel: "Confirm skip tutorial" })
    ).not.toThrow();

    await act(async () => {
      root.findByProps({ accessibilityLabel: "Cancel skip tutorial" }).props.onPress();
    });
    await flushPromises();

    expect(() =>
      root.findByProps({ accessibilityLabel: "Confirm skip tutorial" })
    ).toThrow();

    await act(async () => {
      root.findByProps({ accessibilityLabel: "Next tutorial step" }).props.onPress();
    });
    await flushPromises();

    expect(getTextValues(root)).toContain("View Lesson");
  });
});
