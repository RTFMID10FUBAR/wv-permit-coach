import { useMemo, useState } from 'react';
import pagesRaw from '../content/data/handbook_pages.json';
import { Screen } from '../components/Shell';

interface HandbookPage {
  pdfPage: number;
  printedPage: number;
  chapter: string | null;
  chapterTitle: string;
  text: string;
}

const pages = pagesRaw as HandbookPage[];

const CHAPTERS = Array.from(
  pages.reduce((m, p) => {
    if (p.chapter && !m.has(p.chapter)) m.set(p.chapter, p);
    return m;
  }, new Map<string, HandbookPage>()),
).map(([num, p]) => ({ num, title: p.chapterTitle, pdfPage: p.pdfPage }));

/** Highlight every match of `q` inside `text` without using dangerouslySetInnerHTML. */
function highlight(text: string, q: string) {
  if (!q.trim()) return text;
  const needle = q.trim().toLowerCase();
  const out: (string | React.ReactElement)[] = [];
  let rest = text;
  let key = 0;
  for (;;) {
    const at = rest.toLowerCase().indexOf(needle);
    if (at === -1) {
      out.push(rest);
      break;
    }
    out.push(rest.slice(0, at));
    out.push(
      <mark key={key++}>{rest.slice(at, at + needle.length)}</mark>,
    );
    rest = rest.slice(at + needle.length);
  }
  return out;
}

/**
 * The handbook itself, in the app.
 *
 * Two forms, because they do different jobs. The text is searchable, reflows on a phone
 * and is always available offline — but it is EXTRACTED text and carries the extraction's
 * known limits, so it says so. The PDF is the authoritative document as published.
 */
export function Handbook() {
  const [query, setQuery] = useState('');
  const [openPage, setOpenPage] = useState<number | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 3) return null;
    return pages
      .map((p) => {
        const at = p.text.toLowerCase().indexOf(q);
        if (at === -1) return null;
        const start = Math.max(0, at - 90);
        return {
          page: p,
          snippet:
            (start > 0 ? '…' : '') + p.text.slice(start, at + q.length + 150).replace(/\s+/g, ' '),
        };
      })
      .filter(Boolean) as { page: HandbookPage; snippet: string }[];
  }, [query]);

  const shown = openPage !== null ? pages.find((p) => p.pdfPage === openPage) ?? null : null;

  return (
    <Screen title="The Handbook" back="/">
      <p className="lead">
        The official West Virginia Driver's Licensing Handbook, Revised 07/2026. Every
        question in this app comes from it.
      </p>

      <a className="btn btn-quiet" href="handbook/Drivers_Licensing_Handbook.pdf" target="_blank" rel="noreferrer">
        Open the official PDF (16 MB)
      </a>
      <p className="muted small">
        The searchable text below is extracted from that PDF. A few tables and sign captions
        do not extract perfectly — where a passage looks garbled, the PDF is authoritative.
      </p>

      <label className="field">
        <span>Search the handbook</span>
        <input
          type="search"
          value={query}
          placeholder="e.g. school bus, 0.08, siren"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpenPage(null);
          }}
        />
      </label>

      {results !== null ? (
        <>
          <p className="muted">
            {results.length} page{results.length === 1 ? '' : 's'} match “{query.trim()}”
          </p>
          <ul className="handbook-results">
            {results.map(({ page, snippet }) => (
              <li key={page.pdfPage}>
                <button type="button" className="handbook-hit" onClick={() => setOpenPage(page.pdfPage)}>
                  <span className="handbook-hit-page">
                    {page.chapter ? `Chapter ${page.chapter} · ` : ''}printed page {page.printedPage}
                  </span>
                  <span className="handbook-hit-snippet">{highlight(snippet, query)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <h2>Chapters</h2>
          <ul className="handbook-chapters">
            {CHAPTERS.map((c) => (
              <li key={c.num}>
                <button type="button" className="menu-item" onClick={() => setOpenPage(c.pdfPage)}>
                  <strong>Chapter {c.num}</strong>
                  <span>{c.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {shown ? (
        <div className="handbook-page">
          <h2>
            {shown.chapter ? `Chapter ${shown.chapter} — ${shown.chapterTitle}` : shown.chapterTitle}
          </h2>
          <p className="muted">
            Printed page {shown.printedPage} (PDF page {shown.pdfPage})
          </p>
          <pre className="handbook-text">{highlight(shown.text, query)}</pre>
          <div className="handbook-nav">
            <button
              type="button"
              className="btn btn-quiet"
              disabled={shown.pdfPage <= pages[0].pdfPage}
              onClick={() => setOpenPage(shown.pdfPage - 1)}
            >
              ← Previous page
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              disabled={shown.pdfPage >= pages[pages.length - 1].pdfPage}
              onClick={() => setOpenPage(shown.pdfPage + 1)}
            >
              Next page →
            </button>
          </div>
        </div>
      ) : null}
    </Screen>
  );
}
