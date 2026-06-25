export const CHANGELOG_LABELS = {
  new_feature: { label: "New Feature", color: "#6366f1" },
  improvement: { label: "Improvement", color: "#3b82f6" },
  bug_fix: { label: "Bug Fix", color: "#f97316" },
  security: { label: "Security", color: "#ef4444" },
  deprecation: { label: "Deprecation", color: "#eab308" },
} as const;

export type ChangelogLabel = keyof typeof CHANGELOG_LABELS;

export const CHANGELOG_LABEL_VALUES = Object.keys(
  CHANGELOG_LABELS
) as ChangelogLabel[];

export function isValidLabel(value: string): value is ChangelogLabel {
  return value in CHANGELOG_LABELS;
}

export function getLabelInfo(label: string) {
  return (
    CHANGELOG_LABELS[label as ChangelogLabel] ?? CHANGELOG_LABELS.new_feature
  );
}
