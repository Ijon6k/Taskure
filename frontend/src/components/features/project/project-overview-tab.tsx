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
import { PageContainer } from "@/components/ui/page-container";

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
      });

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
    <div className="flex-1 overflow-y-auto text-theme-primary font-sans flex flex-col items-center">
      <PageContainer variant="default" className="!space-y-9">
        {/* OVERVIEW Header & Edit Action Toggle */}
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.60px]">
            Overview
          </div>

          {isEditingInline ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditingInline(false)}
                className="px-2.5 py-1 bg-surface-l3 hover:bg-surface-l4 border border-theme-default rounded-md text-[12px] text-theme-secondary hover:text-theme-primary flex items-center gap-1 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleSaveInline}
                disabled={saving}
                className="px-3 py-1 bg-brand-accent hover:bg-brand-accent-hover text-black font-medium rounded-md text-[12px] hover:opacity-90 flex items-center gap-1 transition-opacity cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 font-bold" />
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartEdit}
              className="px-2.5 py-1 bg-surface-l3 hover:bg-surface-l4 border border-theme-default rounded-md text-[12px] text-theme-secondary hover:text-theme-primary flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
            >
              <Edit3 className="w-3.5 h-3.5 text-brand-accent" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {/* PROJECT META & TARGET GOAL SECTION */}
        {isEditingInline ? (
          <div className="p-4 bg-surface-l2 border border-theme-default rounded-[8px] space-y-4 animate-in fade-in duration-150">
            <div>
              <label className="text-[12px] font-mono text-theme-secondary block mb-1">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-l4 border border-theme-default rounded-md px-3 py-2 text-[14px] text-theme-primary focus:outline-none focus:border-brand-accent"
              />
            </div>

            <div>
              <label className="text-[12px] font-mono text-theme-secondary block mb-1">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-surface-l4 border border-theme-default rounded-md p-3 text-[14px] text-theme-primary focus:outline-none focus:border-brand-accent resize-none"
              />
            </div>

            <div>
              <label className="text-[12px] font-mono text-theme-secondary block mb-1">Target Goal / Objective</label>
              <textarea
                rows={2}
                value={targetGoal}
                onChange={(e) => setTargetGoal(e.target.value)}
                className="w-full bg-surface-l4 border border-theme-default rounded-md p-3 text-[14px] text-theme-primary focus:outline-none focus:border-brand-accent resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-mono text-theme-secondary block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-surface-l4 border border-theme-default rounded-md px-3 py-2 text-[14px] text-theme-primary focus:outline-none focus:border-brand-accent"
                >
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="completed">completed</option>
                </select>
              </div>

              <div>
                <label className="text-[12px] font-mono text-theme-secondary block mb-1">Target Due Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-surface-l4 border border-theme-default rounded-md px-3 py-2 text-[14px] text-theme-primary focus:outline-none focus:border-brand-accent"
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-mono text-theme-secondary block mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="api, backend, q3..."
                className="w-full bg-surface-l4 border border-theme-default rounded-md px-3 py-2 text-[14px] text-theme-primary focus:outline-none focus:border-brand-accent"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <p className="text-[14px] text-theme-primary/80 leading-[22.75px] font-normal">
              {project.description || "Redesign the public REST API to support the v2 schema and OAuth 2.1."}
            </p>

            {/* Target Goal with Target Icon */}
            <div className="flex items-start gap-2.5 pt-1">
              <Target className="w-4 h-4 text-theme-secondary shrink-0 mt-1" />
              <p className="text-[14px] text-theme-primary/80 leading-[22.75px]">
                {targetGoal}
              </p>
            </div>

            {/* Status & Target Date Line */}
            <div className="flex items-center gap-4 text-[12px] pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                <span className="text-theme-secondary capitalize">{project.status || "active"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-theme-secondary font-mono">
                <Calendar className="w-3.5 h-3.5" />
                <span>{targetDate ? formatDateShort(targetDate) : "Sep 30"}</span>
              </div>
            </div>

            {/* Project Tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {parsedTagsList.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="px-2 py-0.5 bg-surface-l4 border border-theme-default rounded-[4px] text-[11px] text-theme-secondary font-medium flex items-center gap-1"
                >
                  <Tag className="w-2.5 h-2.5 text-theme-secondary" />
                  <span>{tag}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* PROGRESS SECTION */}
        <div className="space-y-3">
          <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.60px]">
            Progress
          </div>

          <div className="p-5 bg-surface-l2 border border-theme-default rounded-[8px] space-y-5 shadow-elevation-l3">
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-theme-primary font-normal">{stats.completionPercent}% complete</span>
              <span className="text-theme-secondary font-mono text-[12px]">
                {stats.doneCount}/{stats.allTasks.length} tasks
              </span>
            </div>

            <ProgressBar percent={stats.completionPercent} color="var(--brand-accent)" />

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
          <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.60px]">
            Today's focus
          </div>

          <div
            onClick={() => focusTask && setSelectedTaskId(focusTask.id)}
            className="p-4 bg-surface-l2 border border-theme-default rounded-[8px] flex items-center justify-between cursor-pointer hover:bg-surface-l4 transition-colors shadow-elevation-l3"
          >
            {focusTask ? (
              <>
                <span className="text-[14px] font-medium text-theme-primary truncate pr-3">
                  {focusTask.title}
                </span>
                <span className="px-2 py-0.5 bg-semantic-danger-subtle text-semantic-danger text-[11px] font-medium rounded-md shrink-0 border border-semantic-danger/20">
                  {focusTask.priority || "Urgent"}
                </span>
              </>
            ) : (
              <span className="text-[13px] text-theme-secondary">
                All tasks completed or no active tasks available.
              </span>
            )}
          </div>
        </div>

        {/* UPCOMING DEADLINES & RECENTLY COMPLETED GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Upcoming Deadlines */}
          <div className="space-y-3">
            <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.60px]">
              Upcoming deadlines
            </div>
            <div className="space-y-1">
              {upcomingTasks.length === 0 ? (
                <div className="text-[12px] text-theme-secondary p-2">
                  No upcoming deadlines set.
                </div>
              ) : (
                upcomingTasks.map((item: TaskData) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedTaskId(item.id)}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-surface-l4 transition-colors cursor-pointer text-[14px]"
                  >
                    <span className="text-theme-primary/80 font-medium truncate pr-2">
                      {item.title}
                    </span>
                    <span className="text-[11px] font-mono text-theme-secondary shrink-0">
                      {formatDateShort(item.due_date)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recently Completed */}
          <div className="space-y-3">
            <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.60px]">
              Recently completed
            </div>
            <div className="space-y-1">
              {completedTasks.length === 0 ? (
                <div className="text-[12px] text-theme-secondary p-2">
                  No completed tasks yet.
                </div>
              ) : (
                completedTasks.map((item: TaskData) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedTaskId(item.id)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-surface-l4 transition-colors cursor-pointer text-[14px]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-semantic-success shrink-0" />
                    <span className="text-theme-secondary font-normal truncate">
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
          <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.60px]">
            Resources & Links
          </div>

          {isEditingInline ? (
            <div className="p-4 bg-surface-l2 border border-theme-default rounded-[8px] space-y-4">
              <div className="space-y-2">
                <span className="text-[12px] font-mono text-theme-secondary">Custom Resource Links:</span>
                {resources.map((res, index) => (
                  <div key={res.id || res.url || `res-edit-${index}`} className="flex items-center justify-between p-2.5 bg-surface-l4 border border-theme-default rounded-md text-[13px]">
                    <div className="truncate pr-2">
                      <span className="text-theme-primary font-medium">{res.title}: </span>
                      <span className="text-theme-secondary font-mono truncate">{res.url}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveResource(res.id)}
                      className="p-1 text-semantic-danger hover:text-red-300 hover:bg-semantic-danger-subtle rounded-[4px] transition-colors"
                      title="Remove resource"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Custom Resource Link Form */}
              <div className="pt-2 space-y-2 border-t border-theme-subtle">
                <span className="text-[11px] text-theme-secondary font-mono">Add Custom Link (e.g. Video Tutorial, Figma):</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newResTitle}
                    onChange={(e) => setNewResTitle(e.target.value)}
                    placeholder="Title (e.g. YouTube Guide)"
                    className="bg-surface-l4 border border-theme-default rounded-md px-3 py-1.5 text-[13px] text-theme-primary focus:outline-none focus:border-brand-accent"
                  />
                  <input
                    type="text"
                    value={newResUrl}
                    onChange={(e) => setNewResUrl(e.target.value)}
                    placeholder="URL (e.g. https://...)"
                    className="bg-surface-l4 border border-theme-default rounded-md px-3 py-1.5 text-[13px] text-theme-primary focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddResource}
                  disabled={!newResTitle.trim() || !newResUrl.trim()}
                  className="px-3 py-1 bg-theme-default/10 hover:bg-theme-default/20 text-theme-primary text-[12px] font-medium rounded-md transition-colors disabled:opacity-40"
                >
                  + Add Link
                </button>
              </div>

              <div className="pt-2">
                <label className="text-[12px] font-mono text-theme-secondary block mb-1">Strategy Notes</label>
                <textarea
                  rows={2}
                  value={strategyNotes}
                  onChange={(e) => setStrategyNotes(e.target.value)}
                  className="w-full bg-surface-l4 border border-theme-default rounded-md p-3 text-[13px] text-theme-primary focus:outline-none focus:border-brand-accent resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {resources.map((res, index) => (
                <a
                  key={res.id || res.url || `res-${index}`}
                  href={res.url.startsWith("http") ? res.url : `https://${res.url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2.5 bg-surface-l4 border border-theme-default rounded-md flex items-center justify-between text-[14px] text-theme-primary/90 hover:text-theme-primary hover:border-brand-accent/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <LinkIcon className="w-3.5 h-3.5 text-theme-secondary group-hover:text-brand-accent transition-colors shrink-0" />
                    <span className="font-medium truncate">{res.title}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-theme-secondary opacity-60 group-hover:opacity-100 shrink-0" />
                </a>
              ))}

              <div className="p-3 bg-surface-l2 border border-theme-default rounded-md text-[14px] text-theme-primary/80 leading-[22.75px]">
                {strategyNotes}
              </div>
            </div>
          )}
        </div>

        {/* QUICK ACTIONS SECTION */}
        <div className="space-y-3">
          <div className="text-[12px] font-medium text-theme-secondary uppercase tracking-[0.60px]">
            Quick actions
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => onSwitchTab && onSwitchTab("board")}
              className="h-[42px] px-3 bg-surface-l3 hover:bg-surface-l4 border border-theme-default rounded-md flex items-center justify-start gap-2.5 text-theme-secondary hover:text-theme-primary text-[14px] font-medium transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-theme-secondary" />
              <span>Open board</span>
            </button>

            <button
              type="button"
              onClick={() => onSwitchTab && onSwitchTab("board")}
              className="h-[42px] px-3 bg-surface-l3 hover:bg-surface-l4 border border-theme-default rounded-md flex items-center justify-start gap-2.5 text-theme-secondary hover:text-theme-primary text-[14px] font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-theme-secondary" />
              <span>Add task</span>
            </button>

            <button
              type="button"
              onClick={handleStartEdit}
              className="h-[42px] px-3 bg-surface-l3 hover:bg-surface-l4 border border-theme-default rounded-md flex items-center justify-start gap-2.5 text-theme-secondary hover:text-theme-primary text-[14px] font-medium transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-theme-secondary" />
              <span>Edit details</span>
            </button>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
