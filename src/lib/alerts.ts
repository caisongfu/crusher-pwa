import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export interface AlertData {
  type: "error" | "warning" | "info";
  level: "P0" | "P1" | "P2" | "P3";
  message: string;
  details?: any;
  userId?: string;
  context?: {
    url?: string;
    userAgent?: string;
    ip?: string;
  };
}

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(",") || [];

export async function sendAlert(data: AlertData) {
  try {
    // 1. 记录到数据库
    const supabase = createClient() as any;
    const { error: dbError } = await supabase
      .from("admin_alerts")
      .insert({
        type: data.type,
        level: data.level,
        message: data.message,
        details: data.details || null,
        user_id: data.userId || null,
        context: data.context || null,
        created_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error("记录告警失败:", dbError);
    }

    // 2. 发送邮件通知管理员
    for (const email of ADMIN_EMAILS) {
      await sendEmailAlert(email, data);
    }

    // 3. 前端显示 toast
    if (typeof window !== "undefined") {
      const emoji =
        data.level === "P0" ? "🚨" : data.level === "P1" ? "⚠️" : "ℹ️";
      toast.error(`${emoji} ${data.message}`);
    }
  } catch (error) {
    console.error("发送告警失败:", error);
  }
}

async function sendEmailAlert(email: string, data: AlertData) {
  // 使用 Supabase Edge Function 或第三方邮件服务
  // 这里使用 Supabase Auth 的内置邮件功能（简化方案）

  const subject = `[Crusher ${data.type.toUpperCase()}][${data.level}] ${
    data.message
  }`;
  const body = `
告警详情：
- 时间：${new Date().toISOString()}
- 类型：${data.type}
- 级别：${data.level}
- 消息：${data.message}
- 用户 ID：${data.userId || "N/A"}
- 详情：${JSON.stringify(data.details, null, 2)}

---

此邮件由 Crusher 系统自动发送，请勿回复。
  `.trim();

  // TODO: 实现邮件发送
  // 可以使用 Supabase Edge Function + Resend/SendGrid
  console.log(`发送邮件告警到 ${email}`, { subject, body });
}

// 自动错误捕获
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    sendAlert({
      type: "error",
      level: "P2",
      message: `JavaScript 错误: ${event.message}`,
      details: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      },
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    sendAlert({
      type: "error",
      level: "P1",
      message: `未处理的 Promise 拒绝: ${event.reason}`,
      details: {
        reason: event.reason,
      },
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
    });
  });
}
