import { NextRequest } from "next/server";

// ===== CORS（必须）=====
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
  let finalModel = "deepseek-chat";

  try {
    const body = await req.json();

    const messages = body.messages || [];
    const content = messages[messages.length - 1]?.content || "";

    // =========================
    // 🧠 自动调度逻辑
    // =========================
    if (content.length < 50) {
      finalModel = "qwen-turbo";
    }

    if (content.includes("写") || content.includes("文章")) {
      finalModel = "deepseek-chat";
    }

    console.log("🔥 当前模型:", finalModel);
    console.log("📩 内容:", content);

    let response;

    // =========================
    // 🟡 Qwen（稳定版写法）
    // =========================
    if (finalModel === "qwen-turbo") {
      try {
        const res = await fetch(
          "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.QWEN_API_KEY}`,
            },
            body: JSON.stringify({
              model: "qwen-turbo",
              input: {
                messages,
              },
            }),
          }
        );

        if (!res.ok) {
          throw new Error("Qwen HTTP error");
        }

        const data = await res.json();

        // 👉 转换为 OpenAI 格式（关键！）
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content:
                    data?.output?.text ||
                    data?.output?.choices?.[0]?.message?.content ||
                    "Qwen返回为空",
                },
              },
            ],
            _model: "qwen-turbo",
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      } catch (err) {
        console.log("⚠️ Qwen失败 → 自动切DeepSeek");

        finalModel = "deepseek-chat";
      }
    }

    // =========================
    // 🔵 DeepSeek（兜底）
    // =========================
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

    const data = await response.json();

    return new Response(
      JSON.stringify({
        ...data,
        _model: finalModel,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: true,
        message: "系统错误",
        detail: String(err),
        _model: finalModel,
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
