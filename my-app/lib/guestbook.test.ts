import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, test } from "vitest";
import { createGuestbook, type Guestbook } from "./guestbook";

let guestbook: Guestbook;

beforeEach(() => {
  const db = new PGlite();
  guestbook = createGuestbook(async (text, params) => {
    const result = await db.query<Record<string, unknown>>(text, params);
    return result.rows;
  });
});

async function leave(name: string, message: string, password = "1234") {
  const result = await guestbook.leaveEntry({ name, message, password });
  if (!result.ok) throw new Error(result.message);
  return result.entry;
}

describe("글 남기기", () => {
  test("남긴 글이 이름, 메시지, 작성 시각과 함께 목록에 나타난다", async () => {
    const before = Date.now();
    await leave("철수", "다녀갑니다");

    const entries = await guestbook.listEntries();

    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("철수");
    expect(entries[0].message).toBe("다녀갑니다");
    expect(entries[0].edited).toBe(false);
    expect(entries[0].createdAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(entries[0].createdAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  test("목록은 최신 작성순이다", async () => {
    await leave("철수", "첫 번째");
    await leave("영희", "두 번째");
    await leave("민수", "세 번째");

    const entries = await guestbook.listEntries();

    expect(entries.map((entry) => entry.message)).toEqual([
      "세 번째",
      "두 번째",
      "첫 번째",
    ]);
  });

  test("이름과 메시지의 앞뒤 공백은 제거된다", async () => {
    await leave("  철수  ", "\n 다녀갑니다 \n");

    const [entry] = await guestbook.listEntries();

    expect(entry.name).toBe("철수");
    expect(entry.message).toBe("다녀갑니다");
  });

  test("같은 이름과 같은 비밀번호로 여러 글을 남길 수 있다", async () => {
    await leave("철수", "하나", "1234");
    await leave("철수", "둘", "1234");

    expect(await guestbook.listEntries()).toHaveLength(2);
  });

  test("목록에는 비밀번호와 관련된 값이 들어 있지 않다", async () => {
    await leave("철수", "다녀갑니다", "secret-password");

    const [entry] = await guestbook.listEntries();

    expect(Object.keys(entry).sort()).toEqual([
      "createdAt",
      "edited",
      "id",
      "message",
      "name",
    ]);
    expect(JSON.stringify(entry)).not.toContain("secret-password");
  });

  test.each([
    ["이름이 비어 있으면", { name: "   ", message: "안녕", password: "1234" }],
    ["이름이 20자를 넘으면", { name: "가".repeat(21), message: "안녕", password: "1234" }],
    ["메시지가 비어 있으면", { name: "철수", message: "  ", password: "1234" }],
    ["메시지가 500자를 넘으면", { name: "철수", message: "가".repeat(501), password: "1234" }],
    ["비밀번호가 4자 미만이면", { name: "철수", message: "안녕", password: "123" }],
  ])("%s 거부되고 글이 남지 않는다", async (_label, input) => {
    const result = await guestbook.leaveEntry(input);

    expect(result.ok).toBe(false);
    expect(await guestbook.listEntries()).toHaveLength(0);
  });

  test("이름 20자, 메시지 500자, 비밀번호 4자는 허용된다", async () => {
    const result = await guestbook.leaveEntry({
      name: "가".repeat(20),
      message: "나".repeat(500),
      password: "1234",
    });

    expect(result.ok).toBe(true);
  });
});

describe("메시지 수정", () => {
  test("비밀번호가 일치하면 메시지가 바뀌고 수정됨이 된다", async () => {
    const entry = await leave("철수", "처음 메시지", "1234");

    const result = await guestbook.editMessage({
      id: entry.id,
      password: "1234",
      message: "고친 메시지",
    });

    const [listed] = await guestbook.listEntries();
    expect(result.ok).toBe(true);
    expect(listed.message).toBe("고친 메시지");
    expect(listed.edited).toBe(true);
  });

  test("비밀번호가 일치하지 않으면 거부되고 글은 그대로다", async () => {
    const entry = await leave("철수", "처음 메시지", "1234");

    const result = await guestbook.editMessage({
      id: entry.id,
      password: "9999",
      message: "고친 메시지",
    });

    const [listed] = await guestbook.listEntries();
    expect(result).toMatchObject({ ok: false, reason: "wrong-password" });
    expect(listed.message).toBe("처음 메시지");
    expect(listed.edited).toBe(false);
  });

  test("수정해도 이름, 작성 시각, 목록 순서는 바뀌지 않는다", async () => {
    const older = await leave("철수", "먼저 쓴 글", "1234");
    await leave("영희", "나중에 쓴 글");

    await guestbook.editMessage({
      id: older.id,
      password: "1234",
      message: "먼저 쓴 글을 고침",
    });

    const entries = await guestbook.listEntries();
    expect(entries.map((entry) => entry.message)).toEqual([
      "나중에 쓴 글",
      "먼저 쓴 글을 고침",
    ]);
    expect(entries[1].name).toBe("철수");
    expect(entries[1].createdAt).toEqual(older.createdAt);
  });

  test("메시지를 바꾸지 않고 제출하면 수정됨이 붙지 않는다", async () => {
    const entry = await leave("철수", "그대로", "1234");

    const result = await guestbook.editMessage({
      id: entry.id,
      password: "1234",
      message: "  그대로  ",
    });

    const [listed] = await guestbook.listEntries();
    expect(result.ok).toBe(true);
    expect(listed.edited).toBe(false);
  });

  test.each([
    ["빈 메시지", "   "],
    ["500자를 넘는 메시지", "가".repeat(501)],
  ])("%s로는 수정할 수 없다", async (_label, message) => {
    const entry = await leave("철수", "처음 메시지", "1234");

    const result = await guestbook.editMessage({
      id: entry.id,
      password: "1234",
      message,
    });

    const [listed] = await guestbook.listEntries();
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(listed.message).toBe("처음 메시지");
  });

  test("없는 글은 수정할 수 없다", async () => {
    const result = await guestbook.editMessage({
      id: 12345,
      password: "1234",
      message: "고친 메시지",
    });

    expect(result).toMatchObject({ ok: false, reason: "not-found" });
  });
});

describe("글 삭제", () => {
  test("비밀번호가 일치하면 글이 목록에서 사라진다", async () => {
    const entry = await leave("철수", "지울 글", "1234");
    await leave("영희", "남을 글");

    const result = await guestbook.deleteEntry({
      id: entry.id,
      password: "1234",
    });

    const entries = await guestbook.listEntries();
    expect(result.ok).toBe(true);
    expect(entries.map((listed) => listed.message)).toEqual(["남을 글"]);
  });

  test("비밀번호가 일치하지 않으면 거부되고 글이 남는다", async () => {
    const entry = await leave("철수", "지울 글", "1234");

    const result = await guestbook.deleteEntry({
      id: entry.id,
      password: "9999",
    });

    expect(result).toMatchObject({ ok: false, reason: "wrong-password" });
    expect(await guestbook.listEntries()).toHaveLength(1);
  });

  test("다른 글의 비밀번호로는 삭제할 수 없다", async () => {
    const mine = await leave("철수", "내 글", "1234");
    await leave("영희", "남의 글", "5678");

    const result = await guestbook.deleteEntry({
      id: mine.id,
      password: "5678",
    });

    expect(result).toMatchObject({ ok: false, reason: "wrong-password" });
  });

  test("이미 없는 글은 삭제할 수 없다", async () => {
    const entry = await leave("철수", "지울 글", "1234");
    await guestbook.deleteEntry({ id: entry.id, password: "1234" });

    const result = await guestbook.deleteEntry({
      id: entry.id,
      password: "1234",
    });

    expect(result).toMatchObject({ ok: false, reason: "not-found" });
  });
});

describe("내 글 찾기", () => {
  test("이름과 비밀번호가 모두 일치하는 글만 최신순으로 찾는다", async () => {
    await leave("철수", "철수 하나", "1234");
    await leave("철수", "철수 비밀번호 다름", "5678");
    await leave("영희", "영희 글", "1234");
    await leave("철수", "철수 둘", "1234");

    const found = await guestbook.findMyEntries({
      name: "철수",
      password: "1234",
    });

    expect(found.map((entry) => entry.message)).toEqual([
      "철수 둘",
      "철수 하나",
    ]);
  });

  test("이름 앞뒤 공백은 무시하고 찾는다", async () => {
    await leave("철수", "철수 글", "1234");

    const found = await guestbook.findMyEntries({
      name: "  철수 ",
      password: "1234",
    });

    expect(found).toHaveLength(1);
  });

  test("이름이 틀리든 비밀번호가 틀리든 똑같이 빈 결과다", async () => {
    await leave("철수", "철수 글", "1234");

    const wrongName = await guestbook.findMyEntries({
      name: "영희",
      password: "1234",
    });
    const wrongPassword = await guestbook.findMyEntries({
      name: "철수",
      password: "9999",
    });

    expect(wrongName).toEqual([]);
    expect(wrongPassword).toEqual([]);
  });
});
