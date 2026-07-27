"use client";

import { Sparkles, Plus, ArrowRight } from "lucide-react";

interface EmptyBoardChoiceStateProps {
  onApplyStarterTemplate: () => void;
  onSelectCreateBlank: () => void;
  isSubmittingTemplate: boolean;
}

export function EmptyBoardChoiceState({
  onApplyStarterTemplate,
  onSelectCreateBlank,
  isSubmittingTemplate,
}: EmptyBoardChoiceStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 max-w-2xl mx-auto my-auto text-center space-y-9 animate-in fade-in duration-300 select-none">
      {/* Eyebrow & Title */}
      <div className="space-y-2.5">
        <span className="text-xs font-mono tracking-[0.2em] uppercase text-theme-tertiary">
          Empty Board
        </span>
        <h3 className="text-2xl sm:text-3xl font-medium tracking-tight text-theme-primary">
          Where should we begin?
        </h3>
      </div>

      {/* Spacious Interactive Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {/* Standard Board Option */}
        <button
          type="button"
          onClick={onApplyStarterTemplate}
          disabled={isSubmittingTemplate}
          className="w-full p-5 sm:p-6 rounded-md bg-theme-surface/50 hover:bg-theme-elevated text-left transition-all duration-200 group cursor-pointer disabled:opacity-40"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-brand-accent shrink-0" />
              <span className="text-sm font-semibold text-theme-primary group-hover:text-brand-accent transition-colors">
                Standard Board
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-theme-tertiary group-hover:text-brand-accent group-hover:translate-x-1 transition-all opacity-0 group-hover:opacity-100" />
          </div>

          {/* Colored Columns Preview Pills */}
          <div className="flex items-center gap-3 mt-3 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-theme-secondary">
              <span className="w-2 h-2 rounded-full shrink-0 bg-[#7F9CF5]" />
              <span>To Do</span>
            </span>
            <span className="text-theme-tertiary">•</span>
            <span className="flex items-center gap-1.5 text-theme-secondary">
              <span className="w-2 h-2 rounded-full shrink-0 bg-[#F59E0B]" />
              <span>In Progress</span>
            </span>
            <span className="text-theme-tertiary">•</span>
            <span className="flex items-center gap-1.5 text-theme-secondary">
              <span className="w-2 h-2 rounded-full shrink-0 bg-[#10B981]" />
              <span>Done</span>
            </span>
          </div>
        </button>

        {/* Custom Column Option */}
        <button
          type="button"
          onClick={onSelectCreateBlank}
          className="w-full p-5 sm:p-6 rounded-md bg-theme-surface/50 hover:bg-theme-elevated text-left transition-all duration-200 group cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Plus className="w-4 h-4 text-theme-secondary group-hover:text-theme-primary shrink-0 transition-colors" />
              <span className="text-sm font-semibold text-theme-primary transition-colors">
                Custom Column
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-theme-tertiary group-hover:text-theme-primary group-hover:translate-x-1 transition-all opacity-0 group-hover:opacity-100" />
          </div>
          <p className="text-xs text-theme-tertiary mt-3 font-mono">
            Type your own custom column name
          </p>
        </button>
      </div>
    </div>
  );
}
