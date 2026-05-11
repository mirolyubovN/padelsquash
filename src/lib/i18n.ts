import ru from "@/src/messages/ru.json";

type Messages = Record<string, string>;

export function t(key: keyof Messages, vars?: Record<string, string | number>): string {
  let msg: string = (ru as Messages)[key] ?? String(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      msg = msg.replace(new RegExp("\\{" + k + "\\}", "g"), String(v));
    }
  }
  return msg;
}
