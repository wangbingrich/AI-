import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const messages = body.messages || [];
  const content = messages?.[messages.length - 1]?.content || "";

  // 👇 用户前端选择的“假模型”
  const fakeModel = body.model;

  // 👇 模型映射（用户选什么 → 实际用什么）
  const modelMap: Record<string, string> = {
    "gpt-4": "deepseek-chat",
    "gpt-4o": "deepseek-chat",
    "gpt-3.5-turbo": "deepseek-chat",
    "qwen-turbo": "qwen-turbo",
  };

  // 👇 默认模型（兜底）
  let realModel = "deepseek-chat";

  // ===== 🧠 自动判断逻辑（你后面可以自己加规则） =====

  // 长文本 → DeepSeek
  if (content.length > 2000) {
    realModel = "deepseek-chat";
  }

  // 写作 / 论文 → DeepSeek
  if (content.includes("写作") || content.includes("论文")) {
    realModel = "deepseek-chat";
  }

  // 闲聊 / 简单问答 → Qwen（更便宜）
  if (content.length < 50) {
    realModel = "qwen-turbo";
  }

  // 👇 最终模型
  const finalModel = modelMap[fakeModel] || realModel;

  try {
    let response;

    // ===== 🚀 Qwen（阿里云） =====
    if (finalModel === "qwen-turbo") {
      response = await fetch(
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.QWEN_API_KEY}`,
          },
          body: JSON.stringify({
            model: "qwen-turbo",
            messages,
          }),
        }
      );
    }

    // ===== 🚀 DeepSeek =====
    else {
      response = await fetch(
        "https://api.deepseek.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages,
          }),
        }
      );
    }

    const data = await response.json();

    return Response.json(data);
  } catch (err) {
    return Response.json({
      error: "API request failed",
      detail: String(err),
    });
  }
}
