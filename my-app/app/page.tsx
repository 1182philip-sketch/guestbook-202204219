import { connection } from "next/server";
import { getGuestbook } from "@/lib/db";
import { Guestbook } from "./ui/guestbook";

const DEVELOPER = { name: "박형준", studentId: "202204219" };

// sv-SE 로캘은 "2026-09-30 14:05" 형식으로 출력한다.
const createdAtFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  dateStyle: "short",
  timeStyle: "short",
});

export default async function Home() {
  await connection();
  const entries = await getGuestbook().listEntries();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">다녀간 자리</h1>
        <p className="text-sm text-zinc-500">한마디 남기고 가세요.</p>
      </header>

      <main className="flex-1">
        <Guestbook
          entries={entries.map((entry) => ({
            id: entry.id,
            name: entry.name,
            message: entry.message,
            createdAt: createdAtFormat.format(entry.createdAt),
            edited: entry.edited,
          }))}
        />
      </main>

      <footer className="border-t border-zinc-200 pt-4 text-center text-xs text-zinc-500 dark:border-zinc-800">
        개발자 {DEVELOPER.name} · 학번 {DEVELOPER.studentId}
      </footer>
    </div>
  );
}
