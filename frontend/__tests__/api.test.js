const {
  fetchLesson,
  fetchLessons,
  fetchHealthProfile,
  fetchChatHistory,
  fetchMessages,
  login,
  register,
  resetClientStateForTests,
  sendMessage,
  updateHealthProfile
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

  it("calls the backend register endpoint and maps the response", async () => {
    const fetchMock = global.fetch;
    fetchMock.mockResolvedValueOnce(
      createResponse({
        status: 201,
        json: {
          access_token: "development-token",
          token_type: "bearer",
          user_name: "alex"
        }
      })
    );

    const result = await register({
      name: "Alex Parker",
      email: "alex@example.com",
      password: "password123"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/auth/register",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "alex@example.com",
          password: "password123",
          name: "Alex Parker",
          health_profile: {
            first_name: "",
            last_name: "",
            gender: "",
            occupation: "",
            phone: "",
            email: "alex@example.com",
            height: "",
            initial_weight: "",
            body_measurements: "",
            weight_statement: "",
            allergy: "N/A",
            medication: "N/A",
            lifestyle: "N/A",
            medical_history: "N/A",
            register_date: ""
          }
        })
      })
    );
    expect(result).toEqual({
      accessToken: "development-token",
      userName: "alex"
    });
  });

  it("loads the saved health profile from the backend", async () => {
    const fetchMock = global.fetch;
    await loginWith(fetchMock);

    fetchMock.mockResolvedValueOnce(
      createResponse({
        json: {
          profile: {
            first_name: "Alex",
            last_name: "Parker",
            gender: "Female",
            occupation: "Teacher",
            phone: "555-111-2222",
            email: "alex@example.com",
            height: "5ft 7in",
            initial_weight: "160",
            body_measurements: "Waist 32",
            weight_statement: "Wants more energy",
            allergy: "Pollen",
            medication: "Inhaler",
            lifestyle: "Daily walks",
            medical_history: "Asthma",
            register_date: "2026-04-12"
          }
        }
      })
    );

    const result = await fetchHealthProfile();

    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://127.0.0.1:8000/auth/profile",
      expect.objectContaining({
        headers: expect.any(Headers)
      })
    );
    expect(result).toEqual({
      firstName: "Alex",
      lastName: "Parker",
      gender: "Female",
      occupation: "Teacher",
      phone: "555-111-2222",
      email: "alex@example.com",
      height: "5ft 7in",
      initialWeight: "160",
      bodyMeasurements: "Waist 32",
      weightStatement: "Wants more energy",
      allergy: "Pollen",
      medication: "Inhaler",
      lifestyle: "Daily walks",
      medicalHistory: "Asthma",
      registerDate: "2026-04-12"
    });
  });

  it("updates the health profile through the backend and maps the saved response", async () => {
    const fetchMock = global.fetch;
    await loginWith(fetchMock);

    fetchMock.mockResolvedValueOnce(
      createResponse({
        json: {
          profile: {
            first_name: "Alex",
            last_name: "Parker",
            gender: "Female",
            occupation: "Teacher",
            phone: "555-111-2222",
            email: "alex@example.com",
            height: "5ft 7in",
            initial_weight: "160",
            body_measurements: "Waist 32",
            weight_statement: "Wants more energy",
            allergy: "Pollen",
            medication: "Inhaler",
            lifestyle: "Daily walks",
            medical_history: "Asthma",
            register_date: "2026-04-12"
          }
        }
      })
    );

    const result = await updateHealthProfile({
      firstName: "Alex",
      lastName: "Parker",
      gender: "Female",
      occupation: "Teacher",
      phone: "555-111-2222",
      email: "alex@example.com",
      height: "5ft 7in",
      initialWeight: "160",
      bodyMeasurements: "Waist 32",
      weightStatement: "Wants more energy",
      allergy: "Pollen",
      medication: "Inhaler",
      lifestyle: "Daily walks",
      medicalHistory: "Asthma",
      registerDate: "2026-04-12"
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://127.0.0.1:8000/auth/profile",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          first_name: "Alex",
          last_name: "Parker",
          gender: "Female",
          occupation: "Teacher",
          phone: "555-111-2222",
          email: "alex@example.com",
          height: "5ft 7in",
          initial_weight: "160",
          body_measurements: "Waist 32",
          weight_statement: "Wants more energy",
          allergy: "Pollen",
          medication: "Inhaler",
          lifestyle: "Daily walks",
          medical_history: "Asthma",
          register_date: "2026-04-12"
        })
      })
    );
    expect(result).toEqual({
      firstName: "Alex",
      lastName: "Parker",
      gender: "Female",
      occupation: "Teacher",
      phone: "555-111-2222",
      email: "alex@example.com",
      height: "5ft 7in",
      initialWeight: "160",
      bodyMeasurements: "Waist 32",
      weightStatement: "Wants more energy",
      allergy: "Pollen",
      medication: "Inhaler",
      lifestyle: "Daily walks",
      medicalHistory: "Asthma",
      registerDate: "2026-04-12"
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
    await loginWith(fetchMock);

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

    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://127.0.0.1:8000/conversations",
      expect.objectContaining({
        headers: expect.any(Headers)
      })
    );
    expect(result).toEqual([
      {
        id: "conv-1",
        title: "Test Session",
        updatedAt: "2026-03-24T18:05:00.000Z"
      }
    ]);
  });

  it("loads lesson summaries from the backend", async () => {
    const fetchMock = global.fetch;
    await loginWith(fetchMock);

    fetchMock.mockResolvedValueOnce(
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

    const result = await fetchLessons();

    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://127.0.0.1:8000/lessons",
      expect.objectContaining({
        headers: expect.any(Headers)
      })
    );
    expect(result).toEqual([
      {
        id: "lesson-01",
        week: 1,
        slug: "welcome",
        title: "Welcome",
        phase: "onboarding",
        summary: "Program overview and participant expectations.",
        status: "in_progress"
      }
    ]);
  });

  it("loads a single lesson detail from the backend", async () => {
    const fetchMock = global.fetch;
    await loginWith(fetchMock);

    fetchMock.mockResolvedValueOnce(
      createResponse({
        json: {
          id: "lesson-03",
          week: 3,
          slug: "smart-goals",
          title: "SMART Goals",
          phase: "onboarding",
          summary: "Turn broad intentions into specific and measurable goals.",
          status: "available",
          objectives: ["Understand SMART goals"],
          sections: [
            {
              type: "text",
              title: "Why SMART Goals Work",
              content: "A goal is more useful when it is concrete enough to act on and track.",
              items: []
            }
          ],
          activity: {
            type: "goal_builder",
            title: "Set Some SMART Goals",
            prompt: "Create one eating goal and one activity goal for this week.",
            fields: [
              {
                id: "food_goal",
                label: "Food SMART goal",
                kind: "text",
                placeholder: "Eat 2 vegetable servings today"
              }
            ]
          }
        }
      })
    );

    const result = await fetchLesson("lesson-03");

    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://127.0.0.1:8000/lessons/lesson-03",
      expect.objectContaining({
        headers: expect.any(Headers)
      })
    );
    expect(result.title).toBe("SMART Goals");
    expect(result.activity.type).toBe("goal_builder");
    expect(result.sections[0].title).toBe("Why SMART Goals Work");
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
        access_token: "alex-token",
        token_type: "bearer",
        user_name: "alex"
      }
    })
  );

  await login({ email: "alex@example.com", password: "password123" });
}

