export const DEFAULT_WORKSPACE_STATUSES = [
  {
    name: "Open",
    slug: "open",
    color: "#6b7280",
    isDefault: true,
    displayOrder: 0,
  },
  {
    name: "Under Review",
    slug: "under_review",
    color: "#8b5cf6",
    isDefault: false,
    displayOrder: 1,
  },
  {
    name: "Planned",
    slug: "planned",
    color: "#7c3aed",
    isDefault: false,
    displayOrder: 2,
  },
  {
    name: "In Progress",
    slug: "in_progress",
    color: "#d97706",
    isDefault: false,
    displayOrder: 3,
  },
  {
    name: "Completed",
    slug: "completed",
    color: "#059669",
    isDefault: false,
    displayOrder: 4,
  },
  {
    name: "Closed",
    slug: "closed",
    color: "#374151",
    isDefault: false,
    displayOrder: 5,
  },
] as const;
