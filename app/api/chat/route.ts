import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const content = body.messages?.[0]?.content || "";

  const modelMap: Record<string, string> = {
    "gpt-4": "deepseek-chat",
    "gpt-4o": "deepseek-chat",
    "gpt-3.5-turbo": "deepseek-chat",
  };

  let realModel = "deepseek-chat";

  if (content.length > 2000) {
    realModel = "deepseek-chat";
  }

  if (content.includes("写作") || content.includes("论文")) {
    realModel = "deepseek-chat";
  }

  const fakeModel = body.model;

  const finalModel = modelMap[fakeModel] || realModel;

  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: finalModel,
        messages: body.messages,
      }),
    });

    const data = await response.json();

    return Response.json(data);
  } catch (err) {
    return Response.json({
      error: "API request failed",
      detail: String(err),
    });
  }
}
