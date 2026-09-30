"use client";

import { useState } from "react";
import { EntryCard, type EntryView } from "./entry-card";
import { EntryForm } from "./entry-form";
import { MyEntries } from "./my-entries";

const TABS = [
  { id: "all", label: "전체 글" },
  { id: "mine", label: "내 글 찾기" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function Guestbook({ entries }: { entries: EntryView[] }) {
  const [tab, setTab] = useState<TabId>("all");

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === id
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 탭을 오가도 입력하던 내용이 남도록 두 패널을 모두 유지한다. */}
      <div
        role="tabpanel"
        id="panel-all"
        aria-labelledby="tab-all"
        hidden={tab !== "all"}
        className="flex flex-col gap-6"
      >
        <EntryForm />
        {entries.length === 0 ? (
          <p className="text-center text-sm text-zinc-500">
            아직 남겨진 글이 없어요. 첫 글을 남겨 보세요.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </div>

      <div
        role="tabpanel"
        id="panel-mine"
        aria-labelledby="tab-mine"
        hidden={tab !== "mine"}
      >
        <MyEntries entries={entries} />
      </div>
    </div>
  );
}
