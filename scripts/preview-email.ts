import "./load-env";
import { mkdirSync, writeFileSync } from "fs";
import { siteUrl } from "../lib/config";
import { confirmMail, digestMail } from "../lib/email-templates";
import { store } from "../lib/storage";
import type { MonitorEvent, MonitorRun } from "../lib/types";

// 발송 없이 /tmp/elm/email-*.html 로 렌더
async function main() {
  const base = siteUrl();
  mkdirSync("/tmp/elm", { recursive: true });
  writeFileSync("/tmp/elm/email-confirm.html", confirmMail(`${base}/api/subscribe/confirm?token=preview`).html);
  const [run] = await store().list<MonitorRun>("runs", { limit: 1 });
  if (!run) return console.log("저장된 run 없음: confirm만 생성");
  const events = (await store().list<MonitorEvent>("events")).filter((e) => e.runId === run.id).slice(0, 5);
  const m = digestMail({ run, events, base, unsubscribeUrl: `${base}/api/subscribe/unsubscribe?token=preview`, test: true });
  writeFileSync("/tmp/elm/email-digest.html", m.html);
  console.log("subject:", m.subject, "| events:", events.length);
  console.log("written: /tmp/elm/email-confirm.html, /tmp/elm/email-digest.html");
}
main();
