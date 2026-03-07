import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
import { deepseekClient, DEEPSEEK_MODEL } from "@/lib/deepseek";
import { checkRateLimit } from "@/lib/rate-limit";
import { deductCredits } from "@/lib/credits";
import { resolvePrompt } from "@/lib/prompts";
import { calculateCreditCost } from "@/types";
import type { LensType } from "@/types";

const InsightRequestSchema = z.object({
  documentId: z.string().uuid().optional(),   // 单文档（向后兼容）
  documentIds: z.array(z.string().uuid()).min(1).max(10).optional(),  // 多文档
  lensType: z.enum([
    "requirements",
    "meeting",
    "review",
    "risk",
    "change",
    "postmortem",
    "tech",
    "custom",
  ]),
  customLensId: z.string().uuid().optional(),
}).refine(
  (data) => data.documentId || (data.documentIds && data.documentIds.length > 0),
  { message: "documentId 或 documentIds 必须提供其一" }
);

type InsightRow = Database["public"]["Tables"]["insights"]["Insert"];

// POST /api/insights — 流式 AI 分析
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = await createClient();

  // 获取用户积分以确定限流额度
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return new Response("用户不存在", { status: 404 });
  }

  // 动态限流检查
  const rateLimitResult = await checkRateLimit(
    user.id,
    (profile as any).credits
  );
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: rateLimitResult.message,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
      },
      { status: 429 }
    );
  }

  // 参数校验
  const body = await request.json();
  const parsed = InsightRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(parsed.error.message, { status: 400 });
  }

  const { documentId, documentIds, lensType, customLensId } = parsed.data;

  // 解析文档 ID 列表（兼容单文档和多文档）
  const docIds = documentIds ?? (documentId ? [documentId] : []);
  const primaryDocId = documentId ?? docIds[0];

  // 批量获取文档并验证归属
  const { data: docs, error: docError } = (await supabase
    .from("documents")
    .select("id, title, raw_content, char_count, user_id")
    .in("id", docIds)
    .eq("user_id", user.id)
    .eq("is_deleted", false)) as any;

  if (docError || !docs || docs.length === 0) {
    return new Response("Document not found", { status: 404 });
  }

  if (docs.length !== docIds.length) {
    return new Response("部分文档不存在或无权访问", { status: 403 });
  }

  // 拼接多文档内容
  const combinedContent = docs
    .map((doc: any) => `--- 文档：${doc.title ?? '未命名'} ---\n${doc.raw_content}`)
    .join("\n\n");

  const totalCharCount = docs.reduce((sum: number, doc: any) => sum + (doc.char_count ?? 0), 0);

  // 计算积分费用
  const creditCost = calculateCreditCost(totalCharCount);

  // 预先扣减积分（流式输出前扣减，防止滥用）
  const deductResult = await deductCredits(
    user.id,
    creditCost,
    `使用${lensType}透镜分析文档`
  );

  if (!deductResult.success) {
    return new Response("Payment Required", { status: 402 });
  }

  // 解析 prompt
  const { system, userPrompt, promptVersion } = await resolvePrompt(
    lensType as LensType,
    combinedContent,         // 使用拼接内容
    customLensId
  );

  // 流式调用 DeepSeek
  const stream = await deepseekClient.chat.completions.create({
    model: DEEPSEEK_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
    stream: true,
    stream_options: { include_usage: true },
  });

  let fullText = "";
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content ?? "";
          if (content) {
            fullText += content;
            controller.enqueue(encoder.encode(content));
          }
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens;
            outputTokens = chunk.usage.completion_tokens;
          }
        }

        // 流结束后保存 insight 记录
        const insertData: InsightRow = {
          document_id: primaryDocId,
          document_ids: docIds.length > 1 ? docIds : null,  // 多文档时填充数组
          user_id: user.id,
          lens_type: lensType,
          custom_lens_id: customLensId ?? null,
          result: fullText,
          model: DEEPSEEK_MODEL,
          prompt_version: promptVersion,
          input_chars: totalCharCount,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          credits_cost: creditCost,
        };

        const { error: insertError } = await supabase
          .from("insights")
          .insert(insertData as any);

        if (insertError) {
          console.error("Failed to insert insight:", insertError);
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

// GET /api/insights — 查询 insights
// 参数：documentId（单文档）或 page+limit+lensType（全量分页）
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");

  const supabase = await createClient();

  // 单文档模式（原有逻辑，文档详情页使用）
  if (documentId) {
    const { data, error } = await supabase
      .from("insights")
      .select("*")
      .eq("document_id", documentId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ insights: data });
  }

  // 全量分页模式（透镜记录页使用）
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const lensType = searchParams.get("lensType") ?? "";
  const offset = (page - 1) * limit;

  let query = supabase
    .from("insights")
    .select("*, documents(id, title)", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (lensType) {
    query = query.eq("lens_type", lensType);
  }

  const { data, error, count } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    insights: data,
    meta: {
      total: count ?? 0,
      page,
      limit,
      hasMore: offset + limit < (count ?? 0),
    },
  });
}
