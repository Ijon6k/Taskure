"use client";

import { X, Trash, PencilSimple, Check, ArrowsLeftRight } from "@phosphor-icons/react";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { TaskPriorityPicker } from "./task-priority-picker";
import { TaskSubtasksSection } from "./task-subtasks-section";
import { TaskLabelsSection } from "./task-labels-section";
import { TaskAttachmentsSection } from "./task-attachments-section";
import { useTaskDrawer } from "./hooks/use-task-drawer";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";


interface TaskDrawerProps {
  taskId: string | null;
  onClose: () => void;
}

/** Slide-over drawer for one task: edit fields, subtasks, attachments, labels and focus pickup. */
export function TaskDrawer({ taskId, onClose }: TaskDrawerProps) {
  const {
    task,
    loading,
    isEditing,
    setIsEditing,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    editTitle,
    setEditTitle,
    editDescription,
    setEditDescription,
    editPriority,
    setEditPriority,
    editDueDate,
    taskTags,
    taskAttachments,
    setTaskAttachments,
    handleAttachmentsChange,
    handleUploadAttachment,
    handleDeleteAttachment,
    columns,
    handleSaveEdit,
    handleColumnChange,
    handleDueDateChange,
    handleTagsChange,
    handleAddChecklist,
    handleToggleChecklist,
    handleDeleteChecklist,
    handleDeleteTask,
  } = useTaskDrawer({ taskId, onClose });

  if (!taskId) return null;

  // ── Render ────────────────────────────────────────────────────────────────


  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden select-none">
        {/* Backdrop */}
        <div
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        />

        <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto max-w-full flex md:pl-10">
          {/* Drawer / Bottom Sheet Container */}
          <div className="w-full md:w-[540px] max-h-[88vh] md:max-h-full bg-surface-l4 border-t md:border-t-0 md:border-l border-theme-subtle text-theme-primary shadow-elevation-l4 flex flex-col h-full rounded-t-2xl md:rounded-tl-[12px] md:rounded-bl-[12px] md:rounded-r-none animate-in slide-in-from-bottom md:slide-in-from-right duration-200">

            {/* Mobile Drag Indicator Bar */}
            <div className="md:hidden pt-2 pb-1 flex justify-center shrink-0">
              <div className="w-12 h-1.5 bg-theme-secondary/40 rounded-full" />
            </div>

            {/* ── Header ── */}
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-theme-subtle flex items-center justify-between bg-surface-l4 shrink-0">
              <span className="text-[13px] font-medium text-theme-secondary uppercase tracking-wider">
                Task Details
              </span>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    <span>Save</span>
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                    <PencilSimple className="w-3.5 h-3.5 text-brand-accent mr-1" />
                    <span>Edit Task</span>
                  </Button>
                )}
                <IconButton
                  icon={Trash}
                  variant="danger"
                  size="sm"
                  title="Delete Task"
                  onClick={() => setIsDeleteModalOpen(true)}
                />
                <IconButton
                  icon={X}
                  variant="ghost"
                  size="sm"
                  title="Close (Esc)"
                  onClick={onClose}
                />
              </div>
            </div>

            {/* ── Body ── */}
            {loading || !task ? (
              <div className="p-6 space-y-4 animate-pulse">
                <div className="w-3/4 h-6 bg-theme-elevated rounded-md" />
                <div className="w-full h-24 bg-theme-elevated rounded-md" />
                <div className="w-1/2 h-4 bg-theme-elevated rounded-md" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 md:space-y-6">

                {/* Column Location & Move Selector */}
                {columns.length > 0 && (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-md bg-theme-elevated border border-theme-default text-[15px]">
                    <span className="text-theme-secondary font-medium flex items-center gap-1.5">
                      <ArrowsLeftRight className="w-4 h-4 text-brand-accent" />
                      <span>Column:</span>
                    </span>
                    <Select value={task.column_id} onValueChange={handleColumnChange}>
                      <SelectTrigger className="w-[170px] h-8 text-[13px] bg-surface-l3 border border-theme-subtle">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((col) => (
                          <SelectItem key={col.id} value={col.id}>
                            {col.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Title */}
                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full text-lg md:text-xl font-medium bg-theme-elevated text-theme-primary border border-theme-default rounded-md p-2.5 focus:border-brand-accent focus:outline-none transition-colors"
                    />
                  ) : (
                    <h1 className="text-lg md:text-xl font-medium text-theme-primary leading-snug">
                      {task.title}
                    </h1>
                  )}
                </div>

                {/* Priority Selector */}
                <TaskPriorityPicker
                  priority={isEditing ? editPriority : task.priority}
                  isEditing={isEditing}
                  onChange={(p) => setEditPriority(p)}
                />

                {/* Due Date Row — DatePickerPopover */}
                <div className="pt-1 space-y-1.5">
                  <div className="text-[13px] font-medium text-theme-secondary uppercase tracking-wider">
                    Due Date
                  </div>
                  <DatePickerPopover
                    value={editDueDate}
                    onChange={handleDueDateChange}
                    placeholder="Set a due date..."
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[13px] font-medium text-theme-secondary uppercase tracking-wider">
                    Description
                  </div>
                  {isEditing ? (
                    <AutoResizeTextarea
                      minRows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="What needs to happen?"
                      className="w-full bg-theme-elevated border border-theme-default rounded-md p-3 text-[15px] text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-brand-accent transition-colors"
                    />
                  ) : (
                    <div className="p-3 bg-theme-elevated border border-theme-default rounded-md text-[15px] min-h-[80px] whitespace-pre-wrap leading-relaxed">
                      {task.description ? (
                        <span className="text-theme-secondary">{task.description}</span>
                      ) : (
                        <span className="text-theme-tertiary italic">No description provided.</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Tags */}
                <CollapsibleSection title="Tags" defaultOpen={true}>
                  <TaskLabelsSection
                    labels={taskTags}
                    onChange={handleTagsChange}
                    projectId={task.project_id}
                  />
                </CollapsibleSection>

                {/* Subtasks */}
                <CollapsibleSection title="Subtasks" defaultOpen={true}>
                  <TaskSubtasksSection
                    checklistItems={task.checklist_items ?? []}
                    onToggleItem={handleToggleChecklist}
                    onDeleteItem={handleDeleteChecklist}
                    onAddItem={handleAddChecklist}
                  />
                </CollapsibleSection>

                {/* Attachments */}
                <CollapsibleSection title="Attachments" defaultOpen={true}>
                  <TaskAttachmentsSection
                    attachments={taskAttachments}
                    onChange={(newAtts) => handleAttachmentsChange(newAtts)}
                    onUploadFile={handleUploadAttachment}
                    onDeleteFile={handleDeleteAttachment}
                  />
                </CollapsibleSection>

              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Task"
        description={`Are you sure you want to delete "${task?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Task"
        isDanger={true}
        onConfirm={handleDeleteTask}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
}
