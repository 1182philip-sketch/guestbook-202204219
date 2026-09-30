"use server";

import { revalidatePath } from "next/cache";
import { getGuestbook } from "@/lib/db";

export type ActionResult = { ok: true } | { ok: false; message: string };

// 서버 액션은 화면을 거치지 않고도 호출될 수 있으므로 들어온 값의 형태를 믿지 않는다.
function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function entryId(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) ? value : -1;
}

function settle(result: ActionResult): ActionResult {
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/");
  return { ok: true };
}

export async function leaveEntry(input: {
  name: string;
  message: string;
  password: string;
}): Promise<ActionResult> {
  return settle(
    await getGuestbook().leaveEntry({
      name: text(input?.name),
      message: text(input?.message),
      password: text(input?.password),
    }),
  );
}

export async function editMessage(input: {
  id: number;
  password: string;
  message: string;
}): Promise<ActionResult> {
  return settle(
    await getGuestbook().editMessage({
      id: entryId(input?.id),
      password: text(input?.password),
      message: text(input?.message),
    }),
  );
}

export async function deleteEntry(input: {
  id: number;
  password: string;
}): Promise<ActionResult> {
  return settle(
    await getGuestbook().deleteEntry({
      id: entryId(input?.id),
      password: text(input?.password),
    }),
  );
}

export async function findMyEntries(input: {
  name: string;
  password: string;
}): Promise<number[]> {
  const found = await getGuestbook().findMyEntries({
    name: text(input?.name),
    password: text(input?.password),
  });
  return found.map((entry) => entry.id);
}
