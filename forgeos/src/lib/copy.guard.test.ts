import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';

// Peter's copy checklist (2026-09-27): no em dashes in anything a user reads.
// Removed 2026-10-01 by a hand pass over 673 of them; this keeps them out.
//
// Parsed with the TypeScript compiler rather than grepped, so comments — where
// an em dash is nobody's business — are never counted. Only string literals,
// template text and JSX text, which is everything that can reach a screen.
//
// English rewrites to commas and colons; Slovak typography uses a spaced en dash
// (" – "), which is correct and allowed. So is an en dash as a lone "no value"
// placeholder, a quote attribution, or a "title – artist" separator.

const src = resolve(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === 'node_modules' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

const TEXT_KINDS = new Set([
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.JsxText,
]);

function emDashesIn(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  if (!text.includes('—')) return [];
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (TEXT_KINDS.has(node.kind) && node.getText(source).includes('—')) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      found.push(`${relative(src, file)}:${line + 1}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe('copy guard', () => {
  it('has no em dash in any text a user can read', () => {
    const offenders = sourceFiles(src).flatMap(emDashesIn);
    // Listed by file:line so the failure says exactly where to look.
    expect(offenders).toEqual([]);
  });
});
