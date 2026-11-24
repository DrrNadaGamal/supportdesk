export default function ArticleBody({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/);
  return (
    <div className="article-body">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\d+\.\s/.test(l))) {
          return <ol key={i}>{lines.map((l, j) => <li key={j}>{l.replace(/^\d+\.\s/, "")}</li>)}</ol>;
        }
        if (lines.every((l) => /^-\s/.test(l))) {
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{l.replace(/^-\s/, "")}</li>)}</ul>;
        }
        return <p key={i}>{b}</p>;
      })}
    </div>
  );
}
