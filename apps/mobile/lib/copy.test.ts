import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const SCANNED = ["app", "components", "lib", "theme"];
const EM_DASH = "—";

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path));
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      found.push(path);
    }
  }
  return found;
}

/**
 * Blanks out comments so only the text a player can actually read is left.
 *
 * Deliberately crude: it keeps line length and line count stable so a reported line number
 * still points at the right line, and it is allowed to be wrong about an em dash inside a
 * string that also contains "//". Nothing in this app has one.
 */
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

describe("user-facing copy", () => {
  it("contains no em dashes", () => {
    const offenders: string[] = [];

    for (const dir of SCANNED) {
      for (const file of sourceFiles(join(ROOT, dir))) {
        const lines = withoutComments(readFileSync(file, "utf8")).split("\n");
        lines.forEach((line, index) => {
          if (line.includes(EM_DASH)) {
            offenders.push(`${relative(ROOT, file)}:${index + 1}: ${line.trim()}`);
          }
        });
      }
    }

    // Comments keep theirs on purpose; this is only about what a player reads.
    expect(offenders).toEqual([]);
  });

  it("actually looks at a meaningful number of files", () => {
    const count = SCANNED.reduce((total, dir) => total + sourceFiles(join(ROOT, dir)).length, 0);

    // Guards the guard: a broken walk would silently pass the check above.
    expect(count).toBeGreaterThan(30);
  });

  it("ignores em dashes that are only in comments", () => {
    const sample = [
      "// a comment with an em dash — here",
      "/* another — one */",
      "/**",
      " * a block — comment",
      " */",
      'const copy = "clean";',
    ].join("\n");

    expect(withoutComments(sample)).not.toContain(EM_DASH);
  });

  it("still finds an em dash in a real string", () => {
    expect(withoutComments('const copy = "keep going — nearly there";')).toContain(EM_DASH);
  });
});
