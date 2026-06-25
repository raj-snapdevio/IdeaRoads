import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { getBoardBySlug } from "@/lib/boards/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import NewPostForm from "./_components/new-post-form";

interface Props {
  params: Promise<{ slug: string; boardSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, boardSlug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) return { title: "New Post" };
  const board = await getBoardBySlug(workspace.id, boardSlug);
  return { title: `New post — ${board?.name ?? "Board"}` };
}

export default async function NewPostPage({ params }: Props) {
  const { slug, boardSlug } = await params;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) notFound();

  const board = await getBoardBySlug(workspace.id, boardSlug);
  if (!board) notFound();

  return (
    <NewPostForm
      boardId={board.id}
      workspaceId={workspace.id}
      workspaceSlug={slug}
      boardSlug={boardSlug}
      boardName={board.name}
    />
  );
}
