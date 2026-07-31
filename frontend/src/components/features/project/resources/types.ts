export type AssetKind = "image" | "file" | "link";

export type AssetSourceKind = "overview" | "task" | "documentation";

export interface AssetSource {
  kind: AssetSourceKind;
  label: string; // e.g. "Project Overview" or "Task: Design V2"
  taskId?: string | undefined;
}

export interface ProjectAsset {
  id: string;
  title: string;
  url: string;
  previewUrl?: string | undefined;
  kind: AssetKind;
  size?: string | undefined;
  mimeType?: string | undefined;
  createdAt?: string | undefined;
  source: AssetSource;
}

export type GroupByOption = "source" | "kind";

export interface AssetGroup {
  id: string;
  title: string;
  assets: ProjectAsset[];
}
