export interface ReactionGroup {
  count: number;
  emoji: string;
  hasReacted: boolean;
}

export interface ReplyData {
  authorAvatar: string | null;
  authorName: string | null;
  body: string;
  createdAt: string;
  id: string;
  isApproved: boolean;
  isDeleted: boolean;
  isGuest: boolean;
  parentId: string | null;
  postId: string;
  reactions: ReactionGroup[];
}

export interface CommentData {
  authorAvatar: string | null;
  authorName: string | null;
  body: string;
  createdAt: string;
  id: string;
  isApproved: boolean;
  isDeleted: boolean;
  isGuest: boolean;
  parentId: string | null;
  postId: string;
  reactions: ReactionGroup[];
  replies: ReplyData[];
}
