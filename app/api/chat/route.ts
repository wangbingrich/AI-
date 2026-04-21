import { NextRequest } from "next/server";

// ✅ 处理跨域（必须）
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const messages = body.messages || [];
    const content = messages[messages.length - 1]?.content || "";

    // 👇 前端传的模型（可以忽略）
    const fakeModel = body.model;

    // 👇 映射（伪装成OpenAI）
    const modelMap: Record<string, string> = {
      "gpt-4": "deepseek-chat",
      "gpt-4o": "deepseek-chat",
      "gpt-3.5-turbo": "deepseek-chat",
      "qwen-turbo": "qwen-turbo",
    };

    // 👇 默认模型
    let realModel = "deepseek-chat";

    // 👇 自动切换逻辑（你可以自己改规则）
    if (content.length < 50) {
      realModel = "qwen-turbo"; // 短内容走便宜模型
    }

    if (content.length > 2000) {
      realModel = "deepseek-chat"; // 长内容走强模型
    }

    if (content.includes("写作") || content.includes("论文")) {
      realModel = "deepseek-chat";
    }

    const finalModel = modelMap[fakeModel] || realModel;

    console.log("🔥 当前模型:", finalModel);
    console.log("📩 用户内容:", content);

    let response;

    // ===== Qwen =====
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
    } else {
      // ===== DeepSeek =====
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

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: true,
        message: "API request failed",
        detail: String(err),
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
