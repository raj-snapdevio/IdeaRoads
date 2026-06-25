export interface ReactionGroup {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export interface ReplyData {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  isDeleted: boolean;
  isApproved: boolean;
  authorName: string | null;
  authorAvatar: string | null;
  isGuest: boolean;
  createdAt: string;
  reactions: ReactionGroup[];
}

export interface CommentData {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  isDeleted: boolean;
  isApproved: boolean;
  authorName: string | null;
  authorAvatar: string | null;
  isGuest: boolean;
  createdAt: string;
  reactions: ReactionGroup[];
  replies: ReplyData[];
}
