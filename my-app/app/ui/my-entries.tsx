"use client";

import { useState, useTransition } from "react";
import { findMyEntries } from "@/app/actions";
import { NAME_MAX_LENGTH } from "@/lib/limits";
import { EntryCard, type EntryView } from "./entry-card";
import { UNEXPECTED_ERROR, errorText, field, primaryButton } from "./styles";

export function MyEntries({ entries }: { entries: EntryView[] }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [found, setFound] = useState<{ ids: number[]; password: string } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const ids = await findMyEntries({ name, password });
        setFound({ ids, password });
        setError("");
      } catch {
        setFound(null);
        setError(UNEXPECTED_ERROR);
      }
    });
  }

  // 전체 목록에서 골라 보여 주므로, 수정·삭제 결과가 다시 찾지 않아도 반영된다.
  const mine = found
    ? entries.filter((entry) => found.ids.includes(entry.id))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={submit}
        className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          글을 남길 때 쓴 이름과 비밀번호를 입력하면, 둘 다 일치하는 글을 모아
          볼 수 있어요. 찾은 글은 비밀번호를 다시 입력하지 않고 수정하거나
          삭제할 수 있습니다.
        </p>
        <label className="flex flex-col gap-1 text-sm font-medium">
          이름
          <input
            className={field}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={NAME_MAX_LENGTH}
            required
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          비밀번호
          <input
            className={field}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="off"
          />
        </label>
        {error && (
          <p role="alert" className={errorText}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className={`self-end ${primaryButton}`}
        >
          {pending ? "찾는 중…" : "내 글 찾기"}
        </button>
      </form>

      {found &&
        (mine.length === 0 ? (
          <p role="status" className="text-center text-sm text-zinc-500">
            {found.ids.length === 0
              ? "일치하는 글이 없습니다."
              : "찾은 글을 모두 삭제했습니다."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {mine.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                knownPassword={found.password}
              />
            ))}
          </ul>
        ))}
    </div>
  );
}
