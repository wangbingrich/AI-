import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
const modelMap: Record<string, string> = {
  "gpt-4": "deepseek-chat",
  "gpt-4o": "deepseek-chat",
  "gpt-3.5-turbo": "deepseek-chat",
};

const model = modelMap[body.model] || "deepseek-chat";
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: model,
      messages: body.messages,
    }),
  });

  const data = await response.json();

  return Response.json(data);
}
