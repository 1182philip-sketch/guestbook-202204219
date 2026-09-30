import { neon } from "@neondatabase/serverless";
import { createGuestbook, type Guestbook } from "./guestbook";

let guestbook: Guestbook | undefined;

export function getGuestbook(): Guestbook {
  if (!guestbook) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL 환경 변수가 설정되어 있지 않습니다.");
    const sql = neon(url);
    guestbook = createGuestbook((text, params) => sql.query(text, params));
  }
  return guestbook;
}
