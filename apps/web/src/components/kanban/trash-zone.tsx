"use client";

import { useDroppable } from "@dnd-kit/core";
import { Trash2 } from "lucide-react";

export function TrashZone({ isDragging }: { isDragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "trash-drop-zone",
  });

  if (!isDragging) return null;

  return (
    <div
      ref={setNodeRef}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-8 py-3.5 rounded-[12px] border-2 border-dashed flex items-center gap-3 transition-all duration-200 shadow-2xl backdrop-blur-md select-none ${
        isOver
          ? "bg-red-600 border-red-300 text-white scale-110 shadow-red-500/40"
          : "bg-red-950/60 border-red-500/50 text-red-400 hover:border-red-400"
      }`}
    >
      <Trash2 className={`w-5 h-5 ${isOver ? "animate-bounce" : ""}`} />
      <span className="text-[13px] font-medium tracking-wide">
        {isOver ? "Release to Delete Task" : "Drag here to Delete Task"}
      </span>
    </div>
  );
}
