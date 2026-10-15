import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const APP_DIR = dirname(fileURLToPath(import.meta.url));
const EM_DASH = "—";

/** Route handlers return JSON to the app, not prose to a reader. The pages are the copy. */
const PAGES_ONLY = (file: string) => file.endsWith("page.tsx") || file.endsWith("layout.tsx");

function pageFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      found.push(...pageFiles(path));
    } else if (PAGES_ONLY(entry)) {
      found.push(path);
    }
  }
  return found;
}

/** Blanks comments while keeping line numbers stable. Mirrors apps/mobile/lib/copy.test.ts;
 * duplicated rather than shared because the two apps have no common test package. */
function withoutComments(source: string): string {
  const blanked = source.replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, " "));
  return blanked
    .split("\n")
    .map((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) return "";
      const comment = line.indexOf("//");
      return comment === -1 ? line : line.slice(0, comment);
    })
    .join("\n");
}

describe("web page copy", () => {
  it("contains no em dashes", () => {
    const offenders: string[] = [];

    for (const file of pageFiles(APP_DIR)) {
      const lines = withoutComments(readFileSync(file, "utf8")).split("\n");
      lines.forEach((line, index) => {
        if (line.includes(EM_DASH)) {
          offenders.push(`${relative(APP_DIR, file)}:${index + 1}: ${line.trim()}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });

  it("covers the legal pages the app links out to", () => {
    const names = pageFiles(APP_DIR).map((file) => relative(APP_DIR, file).replace(/\\/g, "/"));

    expect(names).toContain("privacy/page.tsx");
    expect(names).toContain("terms/page.tsx");
    expect(names).toContain("delete-account/page.tsx");
  });
});
