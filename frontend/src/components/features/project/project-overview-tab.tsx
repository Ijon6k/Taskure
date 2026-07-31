"use client";

import { useState, useMemo, useEffect } from "react";
import { Edit3, CheckCircle2, LayoutGrid, Plus, Check, X } from "lucide-react";
import { api, ProjectData, TaskData, ResourceLinkItem } from "@/lib/api";
import { computeTaskStats } from "@/lib/helpers";
import { ColumnDistributionBar } from "@/components/ui/column-distribution-bar";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { DueDateText } from "@/components/ui/due-date-text";
import { sortBy } from "es-toolkit";
import { toast } from "sonner";
import { useUIStore } from "@/store/use-ui-store";
import { PageContainer } from "@/components/ui/page-container";
import { ProjectMetaSection } from "./overview/project-meta-section";
import { ProjectResourcesSection } from "./overview/project-resources-section";

interface ProjectOverviewTabProps {
  project: ProjectData | null;
  onRefreshProject?: () => void;
  onSwitchTab?: (tab: "board" | "resources") => void;
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

  // Sync state when project data loads
  const settingsJson = JSON.stringify(project?.settings || {});
  const projectVersion = `${project?.id}-${project?.name}-${project?.updated_at}-${settingsJson}`;

  useEffect(() => {
    if (!isEditingInline && project) {
      setName(project.name || "");
      setDescription(project.description || "");
      setStatus(project.status || "active");
      const st = project.settings ?? {};
      setTargetGoal(st.target_goal ?? "");
      setTargetDate(st.target_date ?? "");
      setTagsInput((st.tags ?? []).join(", "));
      setResources(st.resources ?? []);
      setStrategyNotes(st.strategy_notes ?? "");
    }
  }, [projectVersion, isEditingInline]);

  const stats = useMemo(() => {
    return computeTaskStats(project?.columns || []);
  }, [project?.columns]);

  const priorityOrder: Record<string, number> = useMemo(
    () => ({ urgent: 1, high: 2, medium: 3, low: 4 }),
    []
  );

  const completedColumnIds = useMemo(() => {
    const set = new Set<string>();
    (project?.columns || []).forEach((c) => {
      if (c.behavior === "completed") {
        set.add(c.id);
      }
    });
    return set;
  }, [project?.columns]);

  const { sortedActiveTasks, focusTask, upcomingTasks, completedTasks } = useMemo(() => {
    const isCompletedTask = (t: TaskData) =>
      completedColumnIds.has(t.column_id) || t.status === "done" || Boolean((t as TaskData & { is_completed?: boolean }).is_completed);

    const activeTasks = stats.allTasks.filter((t) => !isCompletedTask(t));

    const sorted = sortBy(activeTasks, [(t) => priorityOrder[t.priority || "medium"] || 3]);

    return {
      sortedActiveTasks: sorted,
      focusTask: sorted[0] || null,
      upcomingTasks: sortBy(
        activeTasks.filter((t) => Boolean(t.due_date)),
        [(t) => new Date(t.due_date!).getTime()]
      ).slice(0, 5),
      completedTasks: stats.allTasks.filter(isCompletedTask).slice(0, 5),
    };
  }, [stats.allTasks, completedColumnIds, priorityOrder]);

  if (!project) return null;

  const handleStartEdit = () => {
    setName(project.name || "");
    setDescription(project.description || "");
    setStatus(project.status || "active");
    setTargetGoal(settings.target_goal ?? "");
    setTargetDate(settings.target_date ?? "");
    setTagsInput((settings.tags ?? []).join(", "));
    setResources(settings.resources ?? []);
    setStrategyNotes(settings.strategy_notes ?? "");
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
      <PageContainer variant="wide" className="!space-y-8">
        {/* Header & Edit Action Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-theme-tertiary">
            Project Overview
          </span>

          {isEditingInline ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditingInline(false)}
                className="px-2.5 py-1 text-[12px] text-theme-secondary hover:text-theme-primary flex items-center gap-1 transition-colors cursor-pointer font-medium"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleSaveInline}
                disabled={saving}
                className="px-3 py-1 bg-brand-accent hover:bg-brand-accent-hover text-on-accent font-medium rounded-md text-[12px] hover:opacity-90 flex items-center gap-1 transition-opacity cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 font-bold" />
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartEdit}
              className="px-2.5 py-1 text-[12px] text-theme-secondary hover:text-theme-primary flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
            >
              <Edit3 className="w-3.5 h-3.5 text-brand-accent" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {/* 1. Project Title & Meta Section */}
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

        <hr className="section-divider" />

        {/* 2. Today's Focus — Primary Active Visual Anchor */}
        <div className="space-y-1.5">
          <h2 className="section-title">Today&apos;s Focus</h2>
          <div
            onClick={() => focusTask && setSelectedTaskId(focusTask.id)}
            className="interactive-row px-3.5 py-2.5 flex items-center justify-between cursor-pointer"
          >
            {focusTask ? (
              <>
                <span className="text-[15px] font-medium text-theme-primary truncate pr-3 tracking-tight">
                  {focusTask.title}
                </span>
                <PriorityBadge priority={focusTask.priority} showDot />
              </>
            ) : (
              <span className="text-[13px] text-theme-tertiary">
                All tasks completed or no active tasks available.
              </span>
            )}
          </div>
        </div>

        <hr className="section-divider" />

        {/* 3. Progress Distribution Bar */}
        <ColumnDistributionBar
          columnStats={stats.columnStats}
          totalTasks={stats.allTasks.length}
        />

        <hr className="section-divider" />

        {/* 4. Upcoming Deadlines & Recently Completed */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="space-y-1.5">
            <h3 className="section-title">Upcoming Deadlines</h3>
            {upcomingTasks.length === 0 ? (
              <p className="text-[13px] text-theme-tertiary py-0.5">
                No upcoming deadlines set.
              </p>
            ) : (
              <div className="space-y-0.5">
                {upcomingTasks.map((item: TaskData) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedTaskId(item.id)}
                    className="subtle-row"
                  >
                    <span className="text-[14px] font-medium text-theme-primary truncate flex-1">
                      {item.title}
                    </span>
                    <DueDateText dateStr={item.due_date} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="section-title">Recently Completed</h3>
            {completedTasks.length === 0 ? (
              <p className="text-[13px] text-theme-tertiary py-0.5">
                No completed tasks yet.
              </p>
            ) : (
              <div className="space-y-0.5">
                {completedTasks.map((item: TaskData) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedTaskId(item.id)}
                    className="subtle-row"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-semantic-success shrink-0" />
                    <span className="text-[14px] font-normal text-theme-secondary truncate">
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <hr className="section-divider" />

        {/* 5. Resources & Links */}
        <div className="space-y-1.5">
          <ProjectResourcesSection
            projectId={project.id}
            isEditingInline={isEditingInline}
            resources={isEditingInline ? resources : (settings.resources ?? [])}
            newResTitle={newResTitle}
            setNewResTitle={setNewResTitle}
            newResUrl={newResUrl}
            setNewResUrl={setNewResUrl}
            handleAddResource={handleAddResource}
            handleRemoveResource={handleRemoveResource}
            strategyNotes={strategyNotes}
            setStrategyNotes={setStrategyNotes}
            onOpenResourcesTab={() => onSwitchTab && onSwitchTab("resources")}
            onAddPhotoResource={(newItems) => setResources([...newItems, ...resources])}
          />
        </div>

        <hr className="section-divider" />

        {/* 6. Quick Actions */}
        <div className="space-y-1.5">
          <h3 className="section-title">Quick Actions</h3>
          <div className="flex gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => onSwitchTab && onSwitchTab("board")}
              className="interactive-row px-3 py-1.5 text-[13px] text-theme-secondary hover:text-theme-primary flex items-center gap-2 font-medium transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Open board</span>
            </button>

            <button
              type="button"
              onClick={() => onSwitchTab && onSwitchTab("board")}
              className="interactive-row px-3 py-1.5 text-[13px] text-theme-secondary hover:text-theme-primary flex items-center gap-2 font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add task</span>
            </button>

            <button
              type="button"
              onClick={handleStartEdit}
              className="interactive-row px-3 py-1.5 text-[13px] text-theme-secondary hover:text-theme-primary flex items-center gap-2 font-medium transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit details</span>
            </button>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
