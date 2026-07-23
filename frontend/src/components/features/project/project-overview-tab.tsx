"use client";

import { useState } from "react";
import { Edit3, CheckCircle2, LayoutGrid, Plus, Calendar, Tag, Target, Check, X, Link as LinkIcon, Trash2, ExternalLink } from "lucide-react";
import { api, ProjectData, TaskData, ResourceLinkItem } from "@/lib/api";
import { computeTaskStats, formatDateShort } from "@/lib/helpers";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatCard } from "@/components/ui/stat-card";
import { sortBy } from "es-toolkit";
import { toast } from "sonner";
import { useUIStore } from "@/store/use-ui-store";

interface ProjectOverviewTabProps {
  project: ProjectData | null;
  onRefreshProject?: () => void;
  onSwitchTab?: (tab: "board") => void;
}

export function ProjectOverviewTab({
  project,
  onRefreshProject,
  onSwitchTab,
}: ProjectOverviewTabProps) {
  const { setSelectedTaskId } = useUIStore();
  const [isEditingInline, setIsEditingInline] = useState(false);
  // Use typed settings field — no more (as any) casting
  const settings = project?.settings ?? {};

  // BUG FIX: Default to empty array — no hardcoded placeholders
  const defaultResources: ResourceLinkItem[] = settings.resources ?? [];

  // Editable Form States
  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [status, setStatus] = useState(project?.status || "active");
  const [targetGoal, setTargetGoal] = useState(
    settings.target_goal ?? ""
  );
  const [targetDate, setTargetDate] = useState(settings.target_date ?? "");
  const [tagsInput, setTagsInput] = useState<string>(
    (settings.tags ?? []).join(", ")
  );
  const [resources, setResources] = useState<ResourceLinkItem[]>(defaultResources);
  const [newResTitle, setNewResTitle] = useState("");
  const [newResUrl, setNewResUrl] = useState("");
  const [strategyNotes, setStrategyNotes] = useState(
    settings.strategy_notes ?? ""
  );
  const [saving, setSaving] = useState(false);

  if (!project) return null;

  const stats = computeTaskStats(project.columns || []);

  // Dynamic Priority Focus using es-toolkit sortBy
  const priorityOrder: Record<string, number> = { urgent: 1, high: 2, medium: 3, low: 4 };
  const sortedActiveTasks = sortBy(
    stats.allTasks.filter((t) => t.status !== "done"),
    [(t) => priorityOrder[t.priority || "medium"] || 3]
  );
  const focusTask = sortedActiveTasks[0] || null;

  // Dynamic Upcoming Deadlines using es-toolkit sortBy
  const upcomingTasks = sortBy(
    stats.allTasks.filter((t) => t.due_date && t.status !== "done"),
    [(t) => new Date(t.due_date!).getTime()]
  ).slice(0, 5);

  // Dynamic Recently Completed Tasks
  const completedTasks = stats.allTasks
    .filter((t) => t.status === "done" || (t as any).is_completed)
    .slice(0, 5);

  const handleStartEdit = () => {
    setName(project.name || "");
    setDescription(project.description || "");
    setStatus(project.status || "active");
    setIsEditingInline(true);
  };

  const handleAddResource = () => {
    if (!newResTitle.trim() || !newResUrl.trim()) return;
    const item: ResourceLinkItem = {
      id: `res-${Date.now()}`,
      title: newResTitle.trim(),
      url: newResUrl.trim(),
    };
    setResources([...resources, item]);
    setNewResTitle("");
    setNewResUrl("");
  };

  const handleRemoveResource = (id: string) => {
    setResources(resources.filter((r) => r.id !== id));
  };

  const handleSaveInline = async () => {
    setSaving(true);
    try {
      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      await api.updateProject(project.id, {
        name: name.trim(),
        description: description.trim(),
        status,
        target_goal: targetGoal.trim(),
        target_date: targetDate,
        tags: parsedTags,
        resources: resources,
        strategy_notes: strategyNotes.trim(),
      } as any);

      toast.success("Overview updated successfully!");
      setIsEditingInline(false);
      if (onRefreshProject) onRefreshProject();
    } catch (e) {
      toast.error("Failed to save overview: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const parsedTagsList = tagsInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10 text-[#F0F0F0] font-sans">
      {/* Expanded Container Width: max-w-[780px] */}
      <div className="max-w-[780px] mx-auto space-y-9">
        {/* OVERVIEW Header & Edit Action Toggle */}
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-medium text-[#787878] uppercase tracking-[0.60px]">
            Overview
          </div>

          {isEditingInline ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditingInline(false)}
                className="px-2.5 py-1 bg-theme-elevated hover:bg-theme-hover border border-theme-default rounded-[6px] text-[12px] text-[#787878] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleSaveInline}
                disabled={saving}
                className="px-3 py-1 bg-[#7F9CF5] text-black font-medium rounded-[6px] text-[12px] hover:opacity-90 flex items-center gap-1 transition-opacity cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 font-bold" />
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartEdit}
              className="px-2.5 py-1 bg-[#0C0C0C] hover:bg-[#141414] border border-white/10 rounded-[6px] text-[12px] text-[#787878] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#7F9CF5]" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {/* PROJECT META & TARGET GOAL SECTION */}
        {isEditingInline ? (
          <div className="p-4 bg-[#0C0C0C] border border-white/10 rounded-[8px] space-y-4 animate-in fade-in duration-150">
            <div>
              <label className="text-[12px] font-mono text-[#787878] block mb-1">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#141414] border border-white/10 rounded-[6px] px-3 py-2 text-[14px] text-white focus:outline-none focus:border-[#7F9CF5]"
              />
            </div>

            <div>
              <label className="text-[12px] font-mono text-[#787878] block mb-1">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#141414] border border-white/10 rounded-[6px] p-3 text-[14px] text-white focus:outline-none focus:border-[#7F9CF5] resize-none"
              />
            </div>

            <div>
              <label className="text-[12px] font-mono text-[#787878] block mb-1">Target Goal / Objective</label>
              <textarea
                rows={2}
                value={targetGoal}
                onChange={(e) => setTargetGoal(e.target.value)}
                className="w-full bg-[#141414] border border-white/10 rounded-[6px] p-3 text-[14px] text-white focus:outline-none focus:border-[#7F9CF5] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-mono text-[#787878] block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-[#141414] border border-white/10 rounded-[6px] px-3 py-2 text-[14px] text-white focus:outline-none focus:border-[#7F9CF5]"
                >
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="completed">completed</option>
                </select>
              </div>

              <div>
                <label className="text-[12px] font-mono text-[#787878] block mb-1">Target Due Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-[#141414] border border-white/10 rounded-[6px] px-3 py-2 text-[14px] text-white focus:outline-none focus:border-[#7F9CF5]"
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-mono text-[#787878] block mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="api, backend, q3..."
                className="w-full bg-[#141414] border border-white/10 rounded-[6px] px-3 py-2 text-[14px] text-white focus:outline-none focus:border-[#7F9CF5]"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <p className="text-[14px] text-[#F0F0F0]/80 leading-[22.75px] font-normal">
              {project.description || "Redesign the public REST API to support the v2 schema and OAuth 2.1."}
            </p>

            {/* Target Goal with Target Icon */}
            <div className="flex items-start gap-2.5 pt-1">
              <Target className="w-4 h-4 text-[#787878] shrink-0 mt-1" />
              <p className="text-[14px] text-[#F0F0F0]/80 leading-[22.75px]">
                {targetGoal}
              </p>
            </div>

            {/* Status & Target Date Line */}
            <div className="flex items-center gap-4 text-[12px] pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7F9CF5]" />
                <span className="text-[#787878] capitalize">{project.status || "active"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#787878] font-mono">
                <Calendar className="w-3.5 h-3.5" />
                <span>{targetDate ? formatDateShort(targetDate) : "Sep 30"}</span>
              </div>
            </div>

            {/* Project Tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {parsedTagsList.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-[#141414] border border-white/10 rounded-[4px] text-[11px] text-[#787878] font-medium flex items-center gap-1"
                >
                  <Tag className="w-2.5 h-2.5 text-[#787878]" />
                  <span>{tag}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* PROGRESS SECTION */}
        <div className="space-y-3">
          <div className="text-[12px] font-medium text-[#787878] uppercase tracking-[0.60px]">
            Progress
          </div>

          <div className="p-5 bg-[#0C0C0C] border border-white/10 rounded-[8px] space-y-5 shadow-xs">
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-[#F0F0F0] font-normal">{stats.completionPercent}% complete</span>
              <span className="text-[#787878] font-mono text-[12px]">
                {stats.doneCount}/{stats.allTasks.length} tasks
              </span>
            </div>

            <ProgressBar percent={stats.completionPercent} color="#7F9CF5" />

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-4 gap-2.5 pt-1">
              <StatCard label="Backlog" value={stats.backlogCount} />
              <StatCard label="In Progress" value={stats.inProgressCount} />
              <StatCard label="Review" value={stats.reviewCount} />
              <StatCard label="Done" value={stats.doneCount} />
            </div>
          </div>
        </div>

        {/* TODAY'S FOCUS SECTION */}
        <div className="space-y-3">
          <div className="text-[12px] font-medium text-[#787878] uppercase tracking-[0.60px]">
            Today's focus
          </div>

          <div
            onClick={() => focusTask && setSelectedTaskId(focusTask.id)}
            className="p-4 bg-[#0C0C0C] border border-white/10 rounded-[8px] flex items-center justify-between cursor-pointer hover:bg-[#141414] transition-colors shadow-xs"
          >
            {focusTask ? (
              <>
                <span className="text-[14px] font-medium text-[#F0F0F0] truncate pr-3">
                  {focusTask.title}
                </span>
                <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[11px] font-medium rounded-[6px] shrink-0 border border-red-500/20">
                  {focusTask.priority || "Urgent"}
                </span>
              </>
            ) : (
              <span className="text-[13px] text-[#787878]">
                All tasks completed or no active tasks available.
              </span>
            )}
          </div>
        </div>

        {/* UPCOMING DEADLINES & RECENTLY COMPLETED GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Upcoming Deadlines */}
          <div className="space-y-3">
            <div className="text-[12px] font-medium text-[#787878] uppercase tracking-[0.60px]">
              Upcoming deadlines
            </div>
            <div className="space-y-1">
              {upcomingTasks.length === 0 ? (
                <div className="text-[12px] text-[#787878] p-2">
                  No upcoming deadlines set.
                </div>
              ) : (
                upcomingTasks.map((item: TaskData) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedTaskId(item.id)}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-[6px] hover:bg-[#141414] transition-colors cursor-pointer text-[14px]"
                  >
                    <span className="text-[#F0F0F0]/80 font-medium truncate pr-2">
                      {item.title}
                    </span>
                    <span className="text-[11px] font-mono text-[#787878] shrink-0">
                      {formatDateShort(item.due_date)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recently Completed */}
          <div className="space-y-3">
            <div className="text-[12px] font-medium text-[#787878] uppercase tracking-[0.60px]">
              Recently completed
            </div>
            <div className="space-y-1">
              {completedTasks.length === 0 ? (
                <div className="text-[12px] text-[#787878] p-2">
                  No completed tasks yet.
                </div>
              ) : (
                completedTasks.map((item: TaskData) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedTaskId(item.id)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] hover:bg-[#141414] transition-colors cursor-pointer text-[14px]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#68D391] shrink-0" />
                    <span className="text-[#787878] font-normal truncate">
                      {item.title}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* DYNAMIC RESOURCES SECTION */}
        <div className="space-y-3">
          <div className="text-[12px] font-medium text-[#787878] uppercase tracking-[0.60px]">
            Resources & Links
          </div>

          {isEditingInline ? (
            <div className="p-4 bg-[#0C0C0C] border border-white/10 rounded-[8px] space-y-4">
              <div className="space-y-2">
                <span className="text-[12px] font-mono text-[#787878]">Custom Resource Links:</span>
                {resources.map((res) => (
                  <div key={res.id} className="flex items-center justify-between p-2.5 bg-[#141414] border border-white/10 rounded-[6px] text-[13px]">
                    <div className="truncate pr-2">
                      <span className="text-white font-medium">{res.title}: </span>
                      <span className="text-[#787878] font-mono truncate">{res.url}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveResource(res.id)}
                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-[4px] transition-colors"
                      title="Remove resource"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Custom Resource Link Form */}
              <div className="pt-2 space-y-2 border-t border-white/6">
                <span className="text-[11px] text-[#787878] font-mono">Add Custom Link (e.g. Video Tutorial, Figma):</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newResTitle}
                    onChange={(e) => setNewResTitle(e.target.value)}
                    placeholder="Title (e.g. YouTube Guide)"
                    className="bg-[#141414] border border-white/10 rounded-[6px] px-3 py-1.5 text-[13px] text-white focus:outline-none focus:border-[#7F9CF5]"
                  />
                  <input
                    type="text"
                    value={newResUrl}
                    onChange={(e) => setNewResUrl(e.target.value)}
                    placeholder="URL (e.g. https://...)"
                    className="bg-[#141414] border border-white/10 rounded-[6px] px-3 py-1.5 text-[13px] text-white focus:outline-none focus:border-[#7F9CF5]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddResource}
                  disabled={!newResTitle.trim() || !newResUrl.trim()}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[12px] font-medium rounded-[6px] transition-colors disabled:opacity-40"
                >
                  + Add Link
                </button>
              </div>

              <div className="pt-2">
                <label className="text-[12px] font-mono text-[#787878] block mb-1">Strategy Notes</label>
                <textarea
                  rows={2}
                  value={strategyNotes}
                  onChange={(e) => setStrategyNotes(e.target.value)}
                  className="w-full bg-[#141414] border border-white/10 rounded-[6px] p-3 text-[13px] text-white focus:outline-none focus:border-[#7F9CF5] resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {resources.map((res) => (
                <a
                  key={res.id}
                  href={res.url.startsWith("http") ? res.url : `https://${res.url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2.5 bg-[#141414] border border-white/10 rounded-[6px] flex items-center justify-between text-[14px] text-[#F0F0F0]/90 hover:text-white hover:border-[#7F9CF5]/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <LinkIcon className="w-3.5 h-3.5 text-[#787878] group-hover:text-[#7F9CF5] transition-colors shrink-0" />
                    <span className="font-medium truncate">{res.title}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-[#787878] opacity-60 group-hover:opacity-100 shrink-0" />
                </a>
              ))}

              {/* DISABLED OWNER DISPLAY SECTION (Preserved code as requested) */}
              {/* 
              <div className="px-3 py-2 bg-[#141414] border border-white/10 rounded-[6px] flex items-center justify-between text-[14px]">
                <span className="text-[#787878] text-[12px]">Owner</span>
                <div className="flex items-center gap-1.5 text-[#F0F0F0]/90">
                  <User className="w-3.5 h-3.5 text-[#787878]" />
                  <span>You</span>
                </div>
              </div> 
              */}

              <div className="p-3 bg-[#0C0C0C] border border-white/10 rounded-[6px] text-[14px] text-[#F0F0F0]/80 leading-[22.75px]">
                {strategyNotes}
              </div>
            </div>
          )}
        </div>

        {/* QUICK ACTIONS SECTION */}
        <div className="space-y-3">
          <div className="text-[12px] font-medium text-[#787878] uppercase tracking-[0.60px]">
            Quick actions
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => onSwitchTab && onSwitchTab("board")}
              className="h-[42px] px-3 bg-[#0C0C0C] hover:bg-[#141414] border border-white/10 rounded-[6px] flex items-center justify-start gap-2.5 text-[#787878] hover:text-white text-[14px] font-medium transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#787878]" />
              <span>Open board</span>
            </button>

            <button
              type="button"
              onClick={() => onSwitchTab && onSwitchTab("board")}
              className="h-[42px] px-3 bg-[#0C0C0C] hover:bg-[#141414] border border-white/10 rounded-[6px] flex items-center justify-start gap-2.5 text-[#787878] hover:text-white text-[14px] font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#787878]" />
              <span>Add task</span>
            </button>

            <button
              type="button"
              onClick={handleStartEdit}
              className="h-[42px] px-3 bg-[#0C0C0C] hover:bg-[#141414] border border-white/10 rounded-[6px] flex items-center justify-start gap-2.5 text-[#787878] hover:text-white text-[14px] font-medium transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#787878]" />
              <span>Edit details</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
