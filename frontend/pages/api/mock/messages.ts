import type { NextApiRequest, NextApiResponse } from "next";
import type { ChatMessage } from "@/lib/api";

let mockMessages: ChatMessage[] = [
  {
    id: "m1",
    role: "assistant",
    text: "Welcome. How has your week been feeling emotionally?"
  }
];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatMessage[] | ChatMessage | { message: string }>
) {
  if (req.method === "GET") {
    return res.status(200).json(mockMessages);
  }

  if (req.method === "POST") {
    const text = typeof req.body?.text === "string" ? req.body.text : "";
    if (!text.trim()) {
      return res.status(400).json({ message: "Message text is required" });
    }

    const created: ChatMessage = {
      id: `m${mockMessages.length + 1}`,
      role: "user",
      text
    };
    mockMessages = [...mockMessages, created];
    return res.status(200).json(created);
  }

  return res.status(405).json({ message: "Method not allowed" });
}
