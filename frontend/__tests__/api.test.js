const {
  fetchChatHistory,
  fetchMessages,
  login,
  resetClientStateForTests,
  sendMessage
} = require("../lib/api");

function createResponse({ ok = true, status = 200, json }) {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(json)
  };
}

describe("frontend api client", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    global.fetch = jest.fn();
    resetClientStateForTests();
  });

  it("calls the backend login endpoint and maps the response", async () => {
    const fetchMock = global.fetch;
    fetchMock.mockResolvedValueOnce(
      createResponse({
        json: {
          access_token: "development-token",
          token_type: "bearer",
          user_name: "alex"
        }
      })
    );

    const result = await login({
      email: "alex@example.com",
      password: "password123"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "alex@example.com",
          password: "password123"
        })
      })
    );
    expect(result).toEqual({
      accessToken: "development-token",
      userName: "alex"
    });
  });

  it("posts a user message, requests an assistant reply, and returns updated history", async () => {
    const fetchMock = global.fetch;

    await loginWith(fetchMock);

    fetchMock
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
            content: "I feel stressed.",
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
            content: "Thanks for sharing that.",
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
              content: "I feel stressed.",
              created_at: "2026-03-24T18:01:00.000Z"
            },
            {
              id: "msg-2",
              conversation_id: "conv-1",
              role: "assistant",
              content: "Thanks for sharing that.",
              created_at: "2026-03-24T18:01:10.000Z"
            }
          ]
        })
      );

    const result = await sendMessage("I feel stressed.");

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:8000/conversations",
      expect.objectContaining({
        headers: expect.any(Headers)
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://127.0.0.1:8000/conversations",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://127.0.0.1:8000/conversations/conv-1/messages",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "http://127.0.0.1:8000/conversations/conv-1/assistant-reply",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "http://127.0.0.1:8000/conversations/conv-1/history",
      expect.objectContaining({
        headers: expect.any(Headers)
      })
    );
    expect(result).toEqual([
      {
        id: "msg-1",
        role: "user",
        text: "I feel stressed.",
        createdAt: "2026-03-24T18:01:00.000Z"
      },
      {
        id: "msg-2",
        role: "assistant",
        text: "Thanks for sharing that.",
        createdAt: "2026-03-24T18:01:10.000Z"
      }
    ]);
  });

  it("loads history conversations from the backend", async () => {
    const fetchMock = global.fetch;
    fetchMock.mockResolvedValueOnce(
      createResponse({
        json: [
          {
            id: "conv-1",
            title: "Test Session",
            created_at: "2026-03-24T18:00:00.000Z",
            updated_at: "2026-03-24T18:05:00.000Z"
          }
        ]
      })
    );

    const result = await fetchChatHistory();

    expect(result).toEqual([
      {
        id: "conv-1",
        title: "Test Session",
        updatedAt: "2026-03-24T18:05:00.000Z"
      }
    ]);
  });

  it("returns backend messages for the active conversation", async () => {
    const fetchMock = global.fetch;

    await loginWith(fetchMock);

    fetchMock
      .mockResolvedValueOnce(
        createResponse({
          json: [
            {
              id: "conv-7",
              title: "Alex Session",
              created_at: "2026-03-24T18:00:00.000Z",
              updated_at: "2026-03-24T18:00:00.000Z"
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        createResponse({
          json: [
            {
              id: "msg-3",
              conversation_id: "conv-7",
              role: "assistant",
              content: "Welcome back.",
              created_at: "2026-03-24T18:00:30.000Z"
            }
          ]
        })
      );

    const result = await fetchMessages();

    expect(result).toEqual([
      {
        id: "msg-3",
        role: "assistant",
        text: "Welcome back.",
        createdAt: "2026-03-24T18:00:30.000Z"
      }
    ]);
  });
});

async function loginWith(fetchMock) {
  fetchMock.mockResolvedValueOnce(
    createResponse({
      json: {
        access_token: "development-token",
        token_type: "bearer",
        user_name: "alex"
      }
    })
  );

  await login({ email: "alex@example.com", password: "password123" });
}
