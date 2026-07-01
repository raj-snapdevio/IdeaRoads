"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updatePostCategoryAction } from "@/app/actions/categories";
import { CategoryChip } from "@/components/categories/category-chip";

interface Category {
  color: string;
  id: string;
  name: string;
}

interface CategorySelectProps {
  canEdit: boolean;
  categories: Category[];
  currentCategoryId: string | null;
  postId: string;
  workspaceId: string;
}

export default function CategorySelect({
  postId,
  workspaceId,
  currentCategoryId,
  canEdit,
  categories,
}: CategorySelectProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const current = categories.find((c) => c.id === currentCategoryId) ?? null;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const categoryId = value === "" ? null : value;
    if (categoryId === currentCategoryId) {
      return;
    }
    startTransition(async () => {
      await updatePostCategoryAction({ postId, workspaceId, categoryId });
      router.refresh();
    });
  }

  // Read-only view (non-admins): show the chip only when a category is set.
  if (!canEdit) {
    return current ? (
      <CategoryChip color={current.color} name={current.name} size="xs" />
    ) : null;
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        className="appearance-none bg-muted pl-2.5 pr-7 py-1 text-xs font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        disabled={isPending}
        onChange={handleChange}
        style={{ borderRadius: 2 }}
        value={currentCategoryId ?? ""}
      >
        <option value="">No category</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 size-3 text-muted-foreground opacity-60" />
    </div>
  );
}
