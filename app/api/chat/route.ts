import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const messages = body.messages || [];
  const content = messages[messages.length - 1]?.content || "";

  // 👉 用户选择的模型（可以无视）
  const fakeModel = body.model;

  // 👉 模型映射（后续扩展用）
  const modelMap: Record<string, string> = {
    "gpt-4": "deepseek-chat",
    "gpt-4o": "deepseek-chat",
    "gpt-3.5-turbo": "deepseek-chat",
    "qwen-turbo": "qwen-turbo",
  };

  // =========================
  // 🧠 自动调度核心（重点）
  // =========================

  let realModel = "deepseek-chat"; // 默认高质量

  // 👉 1. 超短内容 → 走 Qwen（省钱）
  if (
    content.length < 50 &&
    !content.includes("写") &&
    !content.includes("代码") &&
    !content.includes("解释")
  ) {
    realModel = "qwen-turbo";
  }

  // 👉 2. 长文本 / 写作 → DeepSeek
  if (
    content.length > 2000 ||
    content.includes("写作") ||
    content.includes("论文")
  ) {
    realModel = "deepseek-chat";
  }

  // 👉 3. 未来可扩展（比如VIP强制高端模型）
  // if (user?.vip) realModel = "deepseek-chat";

  // ❗核心修复：不再完全受 fakeModel 控制
  const finalModel = realModel || modelMap[fakeModel];

  try {
    let response;

    // =========================
    // 🟡 Qwen（阿里云）
    // =========================
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

    // =========================
    // 🔵 DeepSeek
    // =========================
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
