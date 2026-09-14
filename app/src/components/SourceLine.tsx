import type { SourceRef } from '../content/types';

export function SourceLine({ source, showQuote = false }: { source: SourceRef; showQuote?: boolean }) {
  return (
    <div className="source-line">
      <span className="source-label">Handbook:</span>{' '}
      <span>
        Chapter {source.chapter} — {source.chapterTitle}
        {source.section ? `, ${source.section}` : ''}, printed page {source.printedPage} (PDF page{' '}
        {source.pdfPage})
      </span>
      {showQuote && source.sourceQuote ? (
        <blockquote className="source-quote">“{source.sourceQuote}”</blockquote>
      ) : null}
    </div>
  );
}
