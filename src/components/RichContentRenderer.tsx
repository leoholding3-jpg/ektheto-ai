import { useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';

interface RichContentRendererProps {
  content: string;
  copyLabel?: string;
  copiedLabel?: string;
}

function normalizeMathSymbols(expr: string): string {
  return expr
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) / ($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\sum/g, '∑')
    .replace(/\\pi/g, 'π')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\%/g, '%')
    .trim();
}

function renderInlineTokens(text: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\$[^$]+\$|\[\d+\])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push(
        <strong key={keyIdx++} className="font-semibold text-[#111827] dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push(
        <code
          key={keyIdx++}
          className="rounded border border-[#E5E7EB] bg-[#F3F4F6] px-1.5 py-0.5 font-mono text-xs text-[#111827] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('$') && token.endsWith('$')) {
      tokens.push(
        <span
          key={keyIdx++}
          className="rounded border border-[#E5E7EB] bg-[#F9FAFB] px-1.5 py-0.5 font-mono text-xs text-[#111827] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          {normalizeMathSymbols(token.slice(1, -1))}
        </span>
      );
    } else if (/^\[\d+\]$/.test(token)) {
      tokens.push(
        <span
          key={keyIdx++}
          className="font-mono text-xs font-semibold text-[#0F172A] dark:text-slate-200 tabular-nums"
        >
          {token}
        </span>
      );
    } else {
      tokens.push(token);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens;
}

function CodeBlock({
  language,
  code,
  copyLabel,
  copiedLabel,
}: {
  language: string;
  code: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard unavailability
    }
  };

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] dark:border-slate-800 dark:bg-[#0B1120]">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-white px-3 py-1.5 dark:border-slate-800 dark:bg-[#111827]">
        <span className="font-mono text-[11px] font-medium text-[#6B7280] dark:text-slate-400">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-[28px] items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-[#374151] hover:bg-[#F3F4F6] dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? copiedLabel : copyLabel}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-[#111827] dark:text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function isTableSeparator(line: string): boolean {
  return /^\|?(\s*:?-+:?\s*\|)+\s*$/.test(line.trim());
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

export function RichContentRenderer({
  content,
  copyLabel = 'Copy',
  copiedLabel = 'Copied',
}: RichContentRendererProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block ```lang
    if (line.trim().startsWith('```')) {
      const language = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push(
        <CodeBlock
          key={blockKey++}
          language={language}
          code={codeLines.join('\n')}
          copyLabel={copyLabel}
          copiedLabel={copiedLabel}
        />
      );
      continue;
    }

    // Block math $$ ... $$
    if (line.trim().startsWith('$$')) {
      const mathLines: string[] = [];
      const sameLineEnd = line.trim().length > 2 && line.trim().endsWith('$$');
      if (sameLineEnd) {
        mathLines.push(line.trim().slice(2, -2));
        i++;
      } else {
        i++;
        while (i < lines.length && !lines[i].trim().endsWith('$$')) {
          mathLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) i++;
      }
      blocks.push(
        <div
          key={blockKey++}
          className="my-2 overflow-x-auto rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-2.5 font-mono text-xs text-[#111827] dark:border-slate-800 dark:bg-[#0B1120] dark:text-slate-100"
        >
          {normalizeMathSymbols(mathLines.join(' '))}
        </div>
      );
      continue;
    }

    // Markdown table
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const headers = parseTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      blocks.push(
        <div
          key={blockKey++}
          className="my-2 overflow-x-auto rounded-lg border border-[#E5E7EB] dark:border-slate-800"
        >
          <table className="w-full border-collapse text-left text-xs">
            <thead className="border-b border-[#E5E7EB] bg-[#F9FAFB] dark:border-slate-800 dark:bg-[#0B1120]">
              <tr>
                {headers.map((h, hIdx) => (
                  <th
                    key={hIdx}
                    className="px-3 py-2 font-semibold text-[#111827] dark:text-slate-100"
                  >
                    {renderInlineTokens(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] bg-white dark:divide-slate-800 dark:bg-[#111827]">
              {rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {headers.map((_, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-3 py-2 text-[#374151] dark:text-slate-300 tabular-nums"
                    >
                      {renderInlineTokens(row[cIdx] || '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Bullet list
    if (/^\s*[-*•]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*•]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul
          key={blockKey++}
          className="my-2 list-disc space-y-2 pl-6 text-base leading-relaxed text-[#111827] dark:text-[#F8FAFC]"
        >
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInlineTokens(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol
          key={blockKey++}
          className="my-2 list-decimal space-y-2 pl-6 text-base leading-relaxed text-[#111827] dark:text-[#F8FAFC] tabular-nums"
        >
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInlineTokens(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Standard paragraph
    blocks.push(
      <p key={blockKey++} className="text-base leading-relaxed text-[#111827] dark:text-[#F8FAFC]">
        {renderInlineTokens(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1.5">{blocks}</div>;
}
