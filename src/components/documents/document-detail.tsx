"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import type { Document, LensType } from "@/types";
import { markdownToPlainText } from "@/lib/utils";
import { LensSelector } from "@/components/insights/lens-selector";
import { InsightResult } from "@/components/insights/insight-result";

const DETAIL_TIMEOUT_MS = 15_000;

interface DocumentDetailProps {
  document: Document;
}

export function DocumentDetail({ document }: DocumentDetailProps) {
  const [currentLensType, setCurrentLensType] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [completion, setCompletion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isBackground, setIsBackground] = useState(false);
  const [copiedRawMode, setCopiedRawMode] = useState<'md' | 'txt' | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleCopyRaw = async (e: React.MouseEvent, mode: 'md' | 'txt') => {
    e.stopPropagation();
    // raw_content 是纯文本，md 模式直接复制，txt 模式去除任何 Markdown 标记
    const text = mode === 'md' ? document.raw_content : markdownToPlainText(document.raw_content);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedRawMode(mode);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopiedRawMode(null), 2000);
    } catch {
      toast.error("复制失败，请手动选中文字复制");
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const complete = async (
    _prompt: string,
    options: { body: { documentId: string; lensType: string } }
  ) => {
    setIsLoading(true);
    setIsBackground(false);
    setCompletion("");

    let hasReceivedData = false;
    let wentBackground = false;

    // 启动 15 秒倒计时
    setCountdown(15);
    let remaining = 15;
    tickRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining > 0 ? remaining : null);
      if (remaining <= 0) clearInterval(tickRef.current!);
    }, 1000);

    // 15 秒无数据 → 转后台模式
    timeoutRef.current = setTimeout(() => {
      if (!hasReceivedData) {
        wentBackground = true;
        clearInterval(tickRef.current!);
        setCountdown(null);
        setIsLoading(false);
        setIsBackground(true);
        toast.success("分析进行中，稍后在透镜记录中查看结果");
      }
    }, DETAIL_TIMEOUT_MS);

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options.body),
      });

      if (!res.ok) {
        clearTimeout(timeoutRef.current);
        clearInterval(tickRef.current!);
        setCountdown(null);
        throw new Error(`${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // 收到第一个字节 → 清除超时倒计时，切换到流式显示
        if (chunk && !hasReceivedData) {
          hasReceivedData = true;
          clearTimeout(timeoutRef.current);
          clearInterval(tickRef.current!);
          setCountdown(null);
        }

        fullText += chunk;
        if (!wentBackground) {
          setCompletion(fullText);
        }
      }

      if (!wentBackground) {
        toast.success("分析完成");
      }
    } catch (error: unknown) {
      if (!wentBackground) {
        clearTimeout(timeoutRef.current);
        clearInterval(tickRef.current!);
        setCountdown(null);
        const msg = error instanceof Error ? error.message : "";
        if (msg.includes("402")) {
          toast.error("积分不足，请充值后继续");
        } else if (msg.includes("429")) {
          toast.error("操作太频繁，请稍后再试");
        } else {
          toast.error("分析失败，请稍后重试");
        }
      }
    } finally {
      if (!wentBackground) {
        setIsLoading(false);
      }
    }
  };

  const handleAnalyze = async (lensType: LensType) => {
    setCurrentLensType(lensType);
    setIsBackground(false);
    await complete("", {
      body: { documentId: document.id, lensType },
    });
  };

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      {/* 原文区域（可折叠） */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <span className="font-medium text-sm">原文内容</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {(['md', 'txt'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={(e) => handleCopyRaw(e, mode)}
                  title={`复制原文（${mode}）`}
                  className="h-7 px-2 flex items-center gap-1 text-xs rounded transition-colors hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600"
                >
                  {copiedRawMode === mode ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedRawMode === mode ? "已复制" : `复制${mode}`}</span>
                </button>
              ))}
            </div>
            <span className="text-zinc-400 text-xs">
              {document.char_count} 字 · {isCollapsed ? "展开" : "收起"}
            </span>
          </div>
        </button>
        {!isCollapsed && (
          <div className="px-4 pb-4 text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed border-t border-zinc-100">
            {document.raw_content}
          </div>
        )}
      </div>

      {/* 透镜选择器 */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <LensSelector onAnalyze={handleAnalyze} isLoading={isLoading} />
        {isLoading && countdown !== null && (
          <p className="text-xs text-zinc-400 mt-2 text-center">
            等待 AI 响应中，预计 {countdown} 秒...
          </p>
        )}
      </div>

      {/* 后台处理提示 */}
      {isBackground && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center space-y-1">
          <p className="text-sm text-zinc-600">AI 正在后台分析中</p>
          <p className="text-xs text-zinc-400">
            分析完成后，可在透镜记录中查看结果
          </p>
        </div>
      )}

      {/* 流式结果 / 完成结果 */}
      {!isBackground && completion && (
        <InsightResult
          isStreaming={isLoading}
          streamContent={completion}
          lensType={currentLensType}
        />
      )}
    </div>
  );
}
