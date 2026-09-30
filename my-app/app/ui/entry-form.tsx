"use client";

import { useState, useTransition } from "react";
import { leaveEntry } from "@/app/actions";
import {
  MESSAGE_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/limits";
import { UNEXPECTED_ERROR, errorText, field, primaryButton } from "./styles";

export function EntryForm() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await leaveEntry({ name, message, password }).catch(
        () => ({ ok: false as const, message: UNEXPECTED_ERROR }),
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // 이름은 남겨 둔다: 같은 사람이 이어서 쓰기 쉽도록.
      setMessage("");
      setPassword("");
      setError("");
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
    >
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
        메시지
        <textarea
          className={field}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={MESSAGE_MAX_LENGTH}
          rows={3}
          required
        />
        <span className="self-end text-xs font-normal text-zinc-500">
          {message.length} / {MESSAGE_MAX_LENGTH}
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        비밀번호
        <input
          className={field}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={PASSWORD_MIN_LENGTH}
          required
          autoComplete="off"
          aria-describedby="password-notice"
        />
      </label>
      <p
        id="password-notice"
        className="text-xs leading-5 text-zinc-500 dark:text-zinc-400"
      >
        비밀번호는 글마다 따로 정합니다. 같은 이름으로 쓰는 글은 비밀번호도
        같게 해 두면 &lsquo;내 글 찾기&rsquo;에서 한 번에 모아 볼 수 있어요.
        <br />
        잊어버리면 이 글을 수정하거나 삭제할 수 없으니 꼭 기억해 주세요.
      </p>
      {error && (
        <p role="alert" className={errorText}>
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`self-end ${primaryButton}`}>
        {pending ? "남기는 중…" : "글 남기기"}
      </button>
    </form>
  );
}
