"use client";

import { useState, useEffect } from "react";
import { useCompletion } from "ai/react";
import { toast } from "sonner";
import type { Document, Insight, LensType } from "@/types";
import { useAuthStore } from "@/store";
import { LensSelector } from "@/components/insights/lens-selector";
import { InsightResult } from "@/components/insights/insight-result";

interface DocumentDetailProps {
  document: Document;
}

export function DocumentDetail({ document }: DocumentDetailProps) {
  const { updateCredits } = useAuthStore();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [currentLensType, setCurrentLensType] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { completion, isLoading, complete } = useCompletion({
    api: "/api/insights",
    onFinish: (_prompt, completion) => {
      // 刷新历史 insights
      fetchInsights();
      toast.success("分析完成");
    },
    onError: (error) => {
      const msg = error.message ?? "";
      if (msg.includes("402")) {
        toast.error("积分不足，请充值后继续");
      } else if (msg.includes("429")) {
        toast.error("操作太频繁，请稍后再试");
      } else {
        toast.error("分析失败，请稍后重试");
      }
    },
  });

  const fetchInsights = async () => {
    const res = await fetch(`/api/insights?documentId=${document.id}`);
    if (res.ok) {
      const { insights: data } = await res.json();
      setInsights(data ?? []);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [document.id]);

  const handleAnalyze = async (lensType: LensType) => {
    setCurrentLensType(lensType);
    await complete("", {
      body: { documentId: document.id, lensType },
    });
    // 分析完成后更新积分余额（通过重新获取 profile 或用 onFinish 传回的数据）
    // 简单方案：让 TopBar 在下次刷新时更新，或通过 useAuthStore 手动更新
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
          <span className="text-zinc-400 text-xs">
            {document.char_count} 字 · {isCollapsed ? "展开" : "收起"}
          </span>
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
      </div>

      {/* 流式结果（分析中时显示） */}
      {isLoading && completion && (
        <InsightResult
          isStreaming
          streamContent={completion}
          lensType={currentLensType}
        />
      )}

      {/* 历史分析结果 */}
      {insights.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-zinc-500">历史分析</h3>
          {insights.map((insight) => (
            <InsightResult key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}
