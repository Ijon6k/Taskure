"use client";

import Link from "next/link";
import { CheckSquare, Square, ArrowRight } from "lucide-react";
import { FocusResult } from "@/lib/api";

interface TodaysFocusCardProps {
  focusData: FocusResult | null;
  loading: boolean;
}

export function TodaysFocusCard({ focusData, loading }: TodaysFocusCardProps) {
  if (loading) {
    return (
      <div className="w-full bg-[#0C0C0C] border border-white/6 rounded-lg p-5 animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-28 h-4 bg-white/5 rounded" />
          <div className="w-16 h-4 bg-white/5 rounded" />
        </div>
        <div className="w-3/4 h-6 bg-white/5 rounded" />
        <div className="w-full h-12 bg-white/5 rounded" />
      </div>
    );
  }

  if (!focusData || !focusData.task) {
    return (
      <div className="w-full bg-[#0C0C0C] border border-white/6 rounded-lg p-6 text-center space-y-2">
        <h3 className="text-base font-medium text-[#F0F0F0]">Semua Tugas Selesai! 🎉</h3>
        <p className="text-xs text-[#787878]">
          Tidak ada tugas mendesak hari ini. Kerja bagus!
        </p>
      </div>
    );
  }

  const { task, project_name, project_color, reason } = focusData;
  const checklist = task.checklist_items || [];

  return (
    <div className="w-full bg-[#0C0C0C] border border-white/6 rounded-lg p-5 space-y-4">
      {/* Top Bar: Project Tag & Priority Badge */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: project_color || "#7F9CF5" }}
            />
            <span className="text-[12px] font-medium text-[#787878]">
              {project_name}
            </span>
          </div>
          <h2 className="text-[18px] font-medium text-[#F0F0F0] mt-1.5 leading-snug">
            {task.title}
          </h2>
        </div>

        <span className="px-2 py-0.5 rounded-[6px] bg-[#F6685E]/10 text-[#F6685E] text-[11px] font-medium shrink-0">
          {reason || (task.priority === "urgent" ? "Urgent" : task.priority)}
        </span>
      </div>

      {/* Checklist Preview */}
      {checklist.length > 0 && (
        <div className="py-2 border-y border-white/5 space-y-2 text-[14px]">
          {checklist.slice(0, 3).map((item) => (
            <div key={item.id} className="flex items-center gap-2.5">
              {item.is_completed ? (
                <CheckSquare className="w-[15px] h-[15px] text-[#68D391] shrink-0" />
              ) : (
                <Square className="w-[15px] h-[15px] text-[#787878] shrink-0" />
              )}
              <span
                className={
                  item.is_completed
                    ? "line-through text-[#787878]"
                    : "text-[#F0F0F0]/85"
                }
              >
                {item.title}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* CTA Button */}
      <div>
        <Link
          href={`/projects/${task.project_id}/board`}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#7F9CF5] hover:bg-[#6b89e3] text-black text-[14px] font-medium rounded-[6px] transition-colors"
        >
          <span>Continue working</span>
          <ArrowRight className="w-[15px] h-[15px]" />
        </Link>
      </div>
    </div>
  );
}
