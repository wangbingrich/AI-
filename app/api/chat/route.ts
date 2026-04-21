import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const messages = body.messages || [];
  const content = messages[messages.length - 1]?.content || "";

  // 👉 用户前端选择（仅参考，不决定最终）
  const fakeModel = body.model;

  // 👉 模型映射（可扩展）
  const modelMap: Record<string, string> = {
    "gpt-4": "deepseek-chat",
    "gpt-4o": "deepseek-chat",
    "gpt-3.5-turbo": "deepseek-chat",
    "qwen-turbo": "qwen-turbo",
  };

  // =========================
  // 🧠 自动调度逻辑
  // =========================

  let realModel = "deepseek-chat"; // 默认高质量

  // 👉 短内容 → Qwen（省钱）
  if (
    content.length < 50 &&
    !content.includes("写") &&
    !content.includes("代码") &&
    !content.includes("解释")
  ) {
    realModel = "qwen-turbo";
  }

  // 👉 长内容 / 写作 → DeepSeek
  if (
    content.length > 2000 ||
    content.includes("写作") ||
    content.includes("论文")
  ) {
    realModel = "deepseek-chat";
  }

  // ❗最终模型（不完全受前端控制）
  const finalModel = realModel || modelMap[fakeModel];

  // =========================
  // 🔥 日志（关键！）
  // =========================
  console.log("🔥 当前模型:", finalModel);
  console.log("📩 用户内容:", content);

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

    // 👉 返回时附带模型（可选）
    return Response.json({
      ...data,
      _model: finalModel,
    });

  } catch (err) {
    console.error("❌ 请求失败:", err);

    return Response.json({
      error: "API request failed",
      detail: String(err),
    });
  }
}
