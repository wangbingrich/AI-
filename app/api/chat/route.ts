import { NextRequest } from "next/server";

// CORS
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
    // 🧠 自动调度
    // =========================
    if (content.length < 50) {
      finalModel = "qwen-plus"; // 🔥 改这里
    }

    if (content.includes("写") || content.includes("文章")) {
      finalModel = "deepseek-chat";
    }

    console.log("🔥 当前模型:", finalModel);

    let response;

    // =========================
    // 🟡 Qwen（重点调试）
    // =========================
    if (finalModel === "qwen-plus") {
      try {
        const res = await fetch(
          "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.QWEN_API_KEY}`,
            },
            body: JSON.stringify({
              model: "qwen-plus",
              messages,
            }),
          }
        );

        const text = await res.text(); // 🔥 关键：先拿原始返回
        console.log("🟡 Qwen原始返回:", text);

        if (!res.ok) {
          throw new Error("Qwen HTTP错误: " + text);
        }

        return new Response(
          JSON.stringify({
            ...JSON.parse(text),
            _model: "qwen-plus",
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );

      } catch (err) {
        console.log("❌ Qwen彻底失败:", err);

        // 👉 fallback
        finalModel = "deepseek-chat";
      }
    }

    // =========================
    // 🔵 DeepSeek（兜底）
    // =========================
    const dsRes = await fetch(
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

    const dsData = await dsRes.json();

    return new Response(
      JSON.stringify({
        ...dsData,
        _model: "deepseek-chat",
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
