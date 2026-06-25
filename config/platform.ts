export const PRODUCT_NAME = "IdeaRoads";
export const PRODUCT_DESCRIPTION =
  "Open-source customer feedback, voting, and changelog. Self-hosted. MIT licensed.";
export const LOGO_PATH = "/ir-logo.png";

export const GITHUB_REPO_URL = "https://github.com/idearoads/idearoads";
export const DOCS_URL = "https://github.com/idearoads/idearoads#readme";

export const ADMIN_ROLE = "admin";
export const USER_ROLE = "user";

// Workspace member roles
export const WORKSPACE_OWNER = "owner" as const;
export const WORKSPACE_ADMIN = "admin" as const;
export const WORKSPACE_MEMBER = "member" as const;

// Workspace limits
export const MAX_WORKSPACES_PER_USER = 10;
export const MAX_BOARDS_PER_WORKSPACE = 10;
export const MAX_MEMBERS_PER_WORKSPACE: number | null = null;

// Invitation settings
export const INVITE_EXPIRY_DAYS = 7;
export const INVITE_LINK_LABEL_MAX = 100;

// Default board created with every new workspace
export const DEFAULT_BOARD_NAME = "Feature Requests";
export const DEFAULT_BOARD_SLUG = "feature-requests";
export const DEFAULT_BOARD_DESCRIPTION =
  "Share and vote on the features you want to see built.";

// Slugs that cannot be used as workspace slugs (conflict with app routes)
export const RESERVED_SLUGS: readonly string[] = [
  "api",
  "auth",
  "login",
  "logout",
  "onboarding",
  "post-auth",
  "orbit",
  "dashboard",
  "settings",
  "invite",
  "join",
  "demo",
  "features",
  "privacy",
  "terms",
  "public",
  "static",
  "_next",
  "favicon",
  "icon",
  "admin",
  "superadmin",
  "root",
  "system",
  "support",
  "help",
  "idearoads",
  "ir",
  "notifications",
  "profile",
  "account",
  "billing",
  "sitemap",
  "robots",
  "404",
  "500",
];

// Soft-delete marker for comments
export const DELETED_COMMENT_BODY = "[deleted]";

// Supported emoji reactions on comments
export const REACTION_EMOJIS = ["👍", "❤️", "😄", "🎉", "😮", "😢"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];
