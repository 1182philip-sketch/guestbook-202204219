import {
  MESSAGE_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "./limits";
import { hashPassword, verifyPassword } from "./password";

export type Entry = {
  id: number;
  name: string;
  message: string;
  createdAt: Date;
  edited: boolean;
};

export type Rejection = {
  ok: false;
  reason: "invalid" | "wrong-password" | "not-found";
  message: string;
};

export type LeaveEntryResult = { ok: true; entry: Entry } | Rejection;
export type ChangeResult = { ok: true } | Rejection;

type Row = Record<string, unknown>;

// 운영에서는 Neon, 테스트에서는 PGlite가 이 자리에 들어온다.
export type Query = (text: string, params?: unknown[]) => Promise<Row[]>;

export type Guestbook = ReturnType<typeof createGuestbook>;

const ENTRY_COLUMNS = "id, name, message, created_at, updated_at";

function toEntry(row: Row): Entry {
  return {
    id: row.id as number,
    name: row.name as string,
    message: row.message as string,
    createdAt: new Date(row.created_at as string | Date),
    edited: row.updated_at !== null,
  };
}

function invalid(message: string): Rejection {
  return { ok: false, reason: "invalid", message };
}

const WRONG_PASSWORD: Rejection = {
  ok: false,
  reason: "wrong-password",
  message: "비밀번호가 일치하지 않습니다.",
};

const NOT_FOUND: Rejection = {
  ok: false,
  reason: "not-found",
  message: "이미 삭제된 글입니다.",
};

function checkMessage(message: string): Rejection | null {
  if (message.length === 0) return invalid("메시지를 입력해 주세요.");
  if (message.length > MESSAGE_MAX_LENGTH) {
    return invalid(`메시지는 ${MESSAGE_MAX_LENGTH}자 이하로 입력해 주세요.`);
  }
  return null;
}

export function createGuestbook(query: Query) {
  let schemaReady: Promise<unknown> | undefined;

  function ready() {
    schemaReady ??= query(`
      CREATE TABLE IF NOT EXISTS entries (
        id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name text NOT NULL,
        message text NOT NULL,
        password_hash text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz
      )
    `).catch((error) => {
      schemaReady = undefined;
      throw error;
    });
    return schemaReady;
  }

  // 글쓴이인지 확인한다: 그 글의 비밀번호를 아는가.
  async function authorize(
    id: number,
    password: string,
  ): Promise<{ ok: true; message: string } | Rejection> {
    await ready();
    const [row] = await query(
      "SELECT message, password_hash FROM entries WHERE id = $1",
      [id],
    );
    if (!row) return NOT_FOUND;
    if (!(await verifyPassword(password, row.password_hash as string))) {
      return WRONG_PASSWORD;
    }
    return { ok: true, message: row.message as string };
  }

  return {
    async leaveEntry(input: {
      name: string;
      message: string;
      password: string;
    }): Promise<LeaveEntryResult> {
      const name = input.name.trim();
      const message = input.message.trim();

      if (name.length === 0) return invalid("이름을 입력해 주세요.");
      if (name.length > NAME_MAX_LENGTH) {
        return invalid(`이름은 ${NAME_MAX_LENGTH}자 이하로 입력해 주세요.`);
      }
      const messageProblem = checkMessage(message);
      if (messageProblem) return messageProblem;
      if (input.password.length < PASSWORD_MIN_LENGTH) {
        return invalid(
          `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상으로 입력해 주세요.`,
        );
      }

      await ready();
      const [row] = await query(
        `INSERT INTO entries (name, message, password_hash)
         VALUES ($1, $2, $3)
         RETURNING ${ENTRY_COLUMNS}`,
        [name, message, await hashPassword(input.password)],
      );
      return { ok: true, entry: toEntry(row) };
    },

    async listEntries(): Promise<Entry[]> {
      await ready();
      const rows = await query(
        `SELECT ${ENTRY_COLUMNS} FROM entries
         ORDER BY created_at DESC, id DESC`,
      );
      return rows.map(toEntry);
    },

    async editMessage(input: {
      id: number;
      password: string;
      message: string;
    }): Promise<ChangeResult> {
      const message = input.message.trim();
      const messageProblem = checkMessage(message);
      if (messageProblem) return messageProblem;

      const authorization = await authorize(input.id, input.password);
      if (!authorization.ok) return authorization;

      if (message !== authorization.message) {
        const updated = await query(
          `UPDATE entries SET message = $1, updated_at = now()
           WHERE id = $2 RETURNING id`,
          [message, input.id],
        );
        // 확인과 수정 사이에 글이 삭제된 경우.
        if (updated.length === 0) return NOT_FOUND;
      }
      return { ok: true };
    },

    async deleteEntry(input: {
      id: number;
      password: string;
    }): Promise<ChangeResult> {
      const authorization = await authorize(input.id, input.password);
      if (!authorization.ok) return authorization;

      await query("DELETE FROM entries WHERE id = $1", [input.id]);
      return { ok: true };
    },

    async findMyEntries(input: {
      name: string;
      password: string;
    }): Promise<Entry[]> {
      await ready();
      const rows = await query(
        `SELECT ${ENTRY_COLUMNS}, password_hash FROM entries
         WHERE name = $1
         ORDER BY created_at DESC, id DESC`,
        [input.name.trim()],
      );
      const matches = await Promise.all(
        rows.map((row) =>
          verifyPassword(input.password, row.password_hash as string),
        ),
      );
      return rows.filter((_, index) => matches[index]).map(toEntry);
    },
  };
}
