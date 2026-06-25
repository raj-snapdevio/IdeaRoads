import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryList } from "@/components/categories/category-list";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import { getCategoriesForWorkspace } from "@/lib/categories/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Categories — ${slug}` };
}

export default async function CategoriesPage({ params }: Props) {
  const { slug } = await params;
  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) notFound();

  const categories = await getCategoriesForWorkspace(workspace.id);
  const canManage = member.role !== WORKSPACE_MEMBER;

  return (
    <CategoryList
      categories={categories}
      workspaceId={workspace.id}
      canManage={canManage}
    />
  );
}
