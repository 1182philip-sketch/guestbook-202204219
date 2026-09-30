"use client";

import { useState, useTransition } from "react";
import { deleteEntry, editMessage, type ActionResult } from "@/app/actions";
import { MESSAGE_MAX_LENGTH } from "@/lib/limits";
import {
  UNEXPECTED_ERROR,
  dangerButton,
  errorText,
  field,
  primaryButton,
  quietButton,
} from "./styles";

export type EntryView = {
  id: number;
  name: string;
  message: string;
  createdAt: string;
  edited: boolean;
};

type Mode = "view" | "editing" | "deleting";

// knownPassword가 있으면(내 글 찾기) 비밀번호를 다시 묻지 않는다.
export function EntryCard({
  entry,
  knownPassword,
}: {
  entry: EntryView;
  knownPassword?: string;
}) {
  const [mode, setMode] = useState<Mode>("view");
  const [draft, setDraft] = useState(entry.message);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function open(next: Mode) {
    setDraft(entry.message);
    setPassword("");
    setError("");
    setMode(next);
  }

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action().catch(() => ({
        ok: false as const,
        message: UNEXPECTED_ERROR,
      }));
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError("");
      setMode("view");
    });
  }

  function submitEdit(event: React.FormEvent) {
    event.preventDefault();
    run(() =>
      editMessage({
        id: entry.id,
        password: knownPassword ?? password,
        message: draft,
      }),
    );
  }

  function submitDelete(event: React.FormEvent) {
    event.preventDefault();
    run(() => deleteEntry({ id: entry.id, password }));
  }

  function deleteWithKnownPassword(known: string) {
    if (!window.confirm("정말 삭제할까요?")) return;
    run(() => deleteEntry({ id: entry.id, password: known }));
  }

  const passwordInput = (
    <input
      className={field}
      type="password"
      value={password}
      onChange={(event) => setPassword(event.target.value)}
      placeholder="이 글의 비밀번호"
      aria-label="이 글의 비밀번호"
      required
      autoComplete="off"
    />
  );

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-semibold">{entry.name}</span>
        <span className="text-xs text-zinc-500">
          {entry.createdAt}
          {entry.edited && " (수정됨)"}
        </span>
      </div>

      {mode === "editing" ? (
        <form onSubmit={submitEdit} className="flex flex-col gap-2">
          <textarea
            className={field}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={MESSAGE_MAX_LENGTH}
            rows={3}
            aria-label="메시지"
            required
          />
          {knownPassword === undefined && passwordInput}
          {error && (
            <p role="alert" className={errorText}>
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={quietButton}
              onClick={() => open("view")}
              disabled={pending}
            >
              취소
            </button>
            <button type="submit" className={primaryButton} disabled={pending}>
              {pending ? "저장 중…" : "수정 저장"}
            </button>
          </div>
        </form>
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm leading-6">
          {entry.message}
        </p>
      )}

      {mode === "deleting" && (
        <form onSubmit={submitDelete} className="flex flex-col gap-2">
          {passwordInput}
          {error && (
            <p role="alert" className={errorText}>
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={quietButton}
              onClick={() => open("view")}
              disabled={pending}
            >
              취소
            </button>
            <button type="submit" className={dangerButton} disabled={pending}>
              {pending ? "삭제 중…" : "삭제"}
            </button>
          </div>
        </form>
      )}

      {mode === "view" && (
        <div className="flex flex-col items-end gap-2">
          {error && (
            <p role="alert" className={errorText}>
              {error}
            </p>
          )}
          <div className="flex gap-1">
            <button
              type="button"
              className={quietButton}
              onClick={() => open("editing")}
              disabled={pending}
            >
              수정
            </button>
            <button
              type="button"
              className={quietButton}
              onClick={() =>
                knownPassword === undefined
                  ? open("deleting")
                  : deleteWithKnownPassword(knownPassword)
              }
              disabled={pending}
            >
              삭제
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
