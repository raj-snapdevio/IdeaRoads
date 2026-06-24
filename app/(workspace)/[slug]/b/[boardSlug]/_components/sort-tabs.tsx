"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface SortTabsProps {
  activeSort: "newest" | "top";
}

const TABS = [
  { label: "Newest", value: "newest" },
  { label: "Most Voted", value: "top" },
] as const;

export default function SortTabs({ activeSort }: SortTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setSort(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex gap-0">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => setSort(tab.value)}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-150 focus-visible:outline-none ${
            activeSort === tab.value
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
