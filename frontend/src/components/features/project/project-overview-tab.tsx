"use client";

import { useState } from "react";
import { Edit3, CheckCircle2, LayoutGrid, Plus, Check, X } from "lucide-react";
import { api, ProjectData, TaskData, ResourceLinkItem } from "@/lib/api";
import { computeTaskStats, formatDateShort } from "@/lib/helpers";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatCard } from "@/components/ui/stat-card";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { DueDateText } from "@/components/ui/due-date-text";
import { Card, CardHeader } from "@/components/ui/card";
import { sortBy } from "es-toolkit";
import { toast } from "sonner";
import { useUIStore } from "@/store/use-ui-store";
import { PageContainer } from "@/components/ui/page-container";
import { ProjectMetaSection } from "./overview/project-meta-section";
import { ProjectResourcesSection } from "./overview/project-resources-section";

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
  const settings = project?.settings ?? {};

  const defaultResources: ResourceLinkItem[] = settings.resources ?? [];

  // Editable Form States
  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [status, setStatus] = useState(project?.status || "active");
  const [targetGoal, setTargetGoal] = useState(settings.target_goal ?? "");
  const [targetDate, setTargetDate] = useState(settings.target_date ?? "");
  const [tagsInput, setTagsInput] = useState<string>((settings.tags ?? []).join(", "));
  const [resources, setResources] = useState<ResourceLinkItem[]>(defaultResources);
  const [newResTitle, setNewResTitle] = useState("");
  const [newResUrl, setNewResUrl] = useState("");
  const [strategyNotes, setStrategyNotes] = useState(settings.strategy_notes ?? "");
  const [saving, setSaving] = useState(false);

  if (!project) return null;

  const stats = computeTaskStats(project.columns || []);

  const priorityOrder: Record<string, number> = { urgent: 1, high: 2, medium: 3, low: 4 };
  const sortedActiveTasks = sortBy(
    stats.allTasks.filter((t) => t.status !== "done"),
    [(t) => priorityOrder[t.priority || "medium"] || 3]
  );
  const focusTask = sortedActiveTasks[0] || null;

  const upcomingTasks = sortBy(
    stats.allTasks.filter((t) => t.due_date && t.status !== "done"),
    [(t) => new Date(t.due_date!).getTime()]
  ).slice(0, 5);

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
        {/* Header & Edit Action Toggle */}
        <div className="flex items-center justify-between">
          <CardHeader>Overview</CardHeader>

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

        {/* Project Meta Section */}
        <ProjectMetaSection
          project={project}
          isEditingInline={isEditingInline}
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          targetGoal={targetGoal}
          setTargetGoal={setTargetGoal}
          status={status}
          setStatus={setStatus}
          targetDate={targetDate}
          setTargetDate={setTargetDate}
          tagsInput={tagsInput}
          setTagsInput={setTagsInput}
          parsedTagsList={parsedTagsList}
        />

        {/* Progress Section */}
        <div className="space-y-3">
          <CardHeader>Progress</CardHeader>

          <Card className="space-y-5">
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-theme-primary font-normal">{stats.completionPercent}% complete</span>
              <span className="text-theme-secondary font-mono text-[12px]">
                {stats.doneCount}/{stats.allTasks.length} tasks
              </span>
            </div>

            <ProgressBar percent={stats.completionPercent} color="var(--brand-accent)" />

            <div className={`grid gap-2.5 pt-1 ${
              stats.columnStats.length >= 5
                ? "grid-cols-2 sm:grid-cols-5"
                : stats.columnStats.length === 4
                ? "grid-cols-2 sm:grid-cols-4"
                : stats.columnStats.length === 3
                ? "grid-cols-3"
                : "grid-cols-2"
            }`}>
              {stats.columnStats.map((col) => (
                <StatCard
                  key={col.id}
                  label={col.name}
                  value={col.taskCount}
                  color={col.color}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* Today's Focus Section */}
        <div className="space-y-3">
          <CardHeader>Today's focus</CardHeader>

          <div
            onClick={() => focusTask && setSelectedTaskId(focusTask.id)}
            className="p-4 bg-surface-l2 border border-theme-default rounded-md flex items-center justify-between cursor-pointer hover:bg-surface-l4 transition-colors shadow-elevation-l3"
          >
            {focusTask ? (
              <>
                <span className="text-[14px] font-medium text-theme-primary truncate pr-3">
                  {focusTask.title}
                </span>
                <PriorityBadge priority={focusTask.priority} />
              </>
            ) : (
              <span className="text-[13px] text-theme-secondary">
                All tasks completed or no active tasks available.
              </span>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines & Recently Completed Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <CardHeader>Upcoming deadlines</CardHeader>
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
                    <DueDateText dateStr={item.due_date} />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3">
            <CardHeader>Recently completed</CardHeader>
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

        {/* Dynamic Resources Section */}
        <div className="space-y-3">
          <CardHeader>Resources & Links</CardHeader>

          <ProjectResourcesSection
            isEditingInline={isEditingInline}
            resources={resources}
            newResTitle={newResTitle}
            setNewResTitle={setNewResTitle}
            newResUrl={newResUrl}
            setNewResUrl={setNewResUrl}
            handleAddResource={handleAddResource}
            handleRemoveResource={handleRemoveResource}
            strategyNotes={strategyNotes}
            setStrategyNotes={setStrategyNotes}
          />
        </div>

        {/* Quick Actions Section */}
        <div className="space-y-3">
          <CardHeader>Quick actions</CardHeader>

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
