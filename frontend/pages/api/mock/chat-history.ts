import type { NextApiRequest, NextApiResponse } from "next";
import type { ChatSession } from "@/lib/api";

const mockHistory: ChatSession[] = [
  {
    id: "s1",
    title: "Initial Intake Session",
    updatedAt: "2026-03-10T12:00:00.000Z"
  },
  {
    id: "s2",
    title: "Coping Skills Follow-up",
    updatedAt: "2026-03-15T16:30:00.000Z"
  }
];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatSession[] | { message: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  return res.status(200).json(mockHistory);
}
