"use client";
import { useState, useRef } from "react";

interface Canned { id: string; title: string; body: string }

export default function ReplyBox(props: {
  number: number;
  canned: Canned[];
  labels: { reply: string; note: string; send: string; sendResolve: string; pick: string; insert: string; internalBadge: string };
  agentName: string;
  customerName: string;
  placeholder: string;
}) {
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const ref = useRef<HTMLTextAreaElement>(null);
  const { labels } = props;

  function insert(id: string) {
    const c = props.canned.find((x) => x.id === id);
    if (!c || !ref.current) return;
    const text = c.body.replaceAll("{{customer}}", props.customerName.split(" ")[0]).replaceAll("{{agent}}", props.agentName.split(" ")[0]);
    ref.current.value = ref.current.value ? ref.current.value + "\n\n" + text : text;
    ref.current.focus();
  }

  return (
    <form action="/api/act" method="post" className="card card-pad stack" style={{ gap: 12, background: mode === "note" ? "#fffbeb" : "#fff" }}>
      <input type="hidden" name="intent" value="ticket_reply" />
      <input type="hidden" name="number" value={props.number} />
      <input type="hidden" name="mode" value={mode} />
      <div className="spread" style={{ flexWrap: "wrap" }}>
        <div className="tabs-mini">
          <button type="button" className={mode === "reply" ? "on" : ""} onClick={() => setMode("reply")}>{labels.reply}</button>
          <button type="button" className={mode === "note" ? "on" : ""} onClick={() => setMode("note")}>{labels.note}</button>
        </div>
        {mode === "reply" && props.canned.length > 0 && (
          <select className="select" style={{ width: "auto", maxWidth: 260 }} defaultValue="" onChange={(e) => { insert(e.target.value); e.target.value = ""; }} aria-label={labels.insert}>
            <option value="">{labels.pick}</option>
            {props.canned.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        )}
      </div>
      {mode === "note" && <div className="small" style={{ color: "#92600a" }}>{labels.internalBadge}</div>}
      <textarea ref={ref} name="body" className="textarea" required placeholder={props.placeholder} />
      <div className="row-wrap" style={{ justifyContent: "flex-end" }}>
        {mode === "reply" && <button name="resolve" value="1" className="btn btn-green">{labels.sendResolve}</button>}
        <button className="btn">{labels.send}</button>
      </div>
    </form>
  );
}
