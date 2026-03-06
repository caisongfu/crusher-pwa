"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LensType, CustomLens } from "@/types";

const BUILTIN_LENSES: { type: LensType; icon: string; label: string }[] = [
  { type: "requirements", icon: "📋", label: "甲方需求" },
  { type: "meeting", icon: "📝", label: "会议纪要" },
  { type: "review", icon: "🔍", label: "需求评审" },
  { type: "risk", icon: "⚠️", label: "风险识别" },
  { type: "change", icon: "📊", label: "变更影响" },
  { type: "postmortem", icon: "🐛", label: "问题复盘" },
  { type: "tech", icon: "📖", label: "技术决策" },
];

interface LensOption {
  type: LensType;
  icon: string;
  label: string;
  customLensId?: string;
}

interface LensSelectorProps {
  onAnalyze: (lensType: LensType, customLensId?: string) => void;
  isLoading: boolean;
}

export function LensSelector({ onAnalyze, isLoading }: LensSelectorProps) {
  const [selected, setSelected] = useState<{
    lensType: LensType;
    customLensId?: string;
  } | null>(null);
  const [customLenses, setCustomLenses] = useState<CustomLens[]>([]);

  useEffect(() => {
    // 加载自定义透镜
    fetch("/api/lenses")
      .then((r) => r.json())
      .then(({ data }) => setCustomLenses(data ?? []))
      .catch(() => {
        /* 静默失败，显示内置透镜即可 */
      });
  }, []);

  const allLenses: LensOption[] = [
    ...BUILTIN_LENSES,
    ...customLenses.map((lens) => ({
      type: "custom" as LensType,
      icon: lens.icon,
      label: lens.name,
      customLensId: lens.id,
    })),
  ];

  const isSelected = (option: LensOption) =>
    selected?.lensType === option.type &&
    selected?.customLensId === option.customLensId;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-zinc-700">选择分析透镜</h3>
      <div className="grid grid-cols-4 gap-2 md:grid-cols-7 lg:grid-cols-8">
        {allLenses.map((lens) => (
          <button
            key={`${lens.type}-${lens.customLensId ?? ""}`}
            onClick={() =>
              setSelected({
                lensType: lens.type,
                customLensId: lens.customLensId,
              })
            }
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all",
              isSelected(lens)
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white hover:border-zinc-400"
            )}
          >
            <span className="text-xl">{lens.icon}</span>
            <span className="text-xs leading-tight">{lens.label}</span>
          </button>
        ))}
      </div>
      <Button
        onClick={() =>
          selected && onAnalyze(selected.lensType, selected.customLensId)
        }
        disabled={!selected || isLoading}
        className="w-full"
      >
        {isLoading ? "分析中..." : "开始分析"}
      </Button>
    </div>
  );
}
