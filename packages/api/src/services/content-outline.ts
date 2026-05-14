/**
 * Content outline text parser and types.
 *
 * Parses indented plain-text outlines into structured content outline
 * objects that the generation pipeline can enrich and visualise.
 */

/** A branch node in a content outline. */
export type ContentOutlineBranch = {
  id: string;
  class: "branch";
  concept: string;
  doodlePrompt?: string;
  children: ContentOutlineSubbranch[];
};

/** A sub-branch or leaf node in a content outline. */
export type ContentOutlineSubbranch = {
  id: string;
  class: "subbranch";
  concept: string;
  doodlePrompt?: string;
  children: ContentOutlineSubbranch[];
};

/** Root shape of a parsed content outline. */
export type ContentOutline = {
  schema: "omm.content_outline";
  version: 1;
  center: {
    id: "center";
    concept: string;
    doodlePrompt?: string;
  };
  branches: ContentOutlineBranch[];
};

/** Counts leading spaces in a line (tabs rejected). */
function countIndent(line: string): number {
  const match = line.match(/^( *)/);
  if (!match) return 0;
  if (line.match(/\t/)) {
    throw new Error("Tabs are not allowed in content-outline-text");
  }
  return match[1].length;
}

/** Result of parsing a sub-branch subtree. */
type SubbranchResult = {
  node: ContentOutlineSubbranch;
  nextIndex: number;
};

/** Recursively parses sub-branches from an indented text source. */
function parseSubbranch(
  parsed: Array<{ indent: number; concept: string }>,
  index: number,
  parentAndSibling: { parentId: string; siblingIdx: number },
): SubbranchResult {
  const { parentId, siblingIdx } = parentAndSibling;
  const parentIndent = parsed[index].indent;
  const id = `${parentId}_${String(siblingIdx + 1).padStart(3, "0")}`;
  const node: ContentOutlineSubbranch = {
    id,
    class: "subbranch",
    concept: parsed[index].concept,
    children: [],
  };

  let i = index + 1;
  let childIdx = 0;
  while (i < parsed.length && parsed[i].indent > parentIndent) {
    if (parsed[i].indent !== parentIndent + 2) {
      throw new Error(
        `Indentation skip at position ${i}: expected ${parentIndent + 2}, got ${parsed[i].indent}`,
      );
    }
    const child = parseSubbranch(parsed, i, {
      parentId: id,
      siblingIdx: childIdx,
    });
    node.children.push(child.node);
    i = child.nextIndex;
    childIdx++;
  }

  return { node, nextIndex: i };
}

/** Parsed line with indent and concept extracted. */
type ParsedLine = { indent: number; concept: string };

/** Filters and parses lines into indent/concept pairs. */
function filterAndParseLines(text: string): ParsedLine[] {
  const lines = text
    .split("\n")
    .map((raw) => ({ raw }))
    .filter((l) => {
      const trimmed = l.raw.trim();
      return trimmed.length > 0 && !trimmed.startsWith("#");
    });

  if (lines.length === 0) {
    throw new Error("content-outline-text is empty");
  }
  return lines.map((l) => ({
    indent: countIndent(l.raw),
    concept: l.raw.trim(),
  }));
}

/** Parses branches from indent-parsed lines starting after center. */
function parseBranches(parsed: ParsedLine[]): ContentOutlineBranch[] {
  const branches: ContentOutlineBranch[] = [];
  let branchIdx = 0;
  let i = 1;

  while (i < parsed.length) {
    if (parsed[i].indent === 2) {
      branchIdx++;
      const branchId = `branch_${String(branchIdx).padStart(3, "0")}`;
      const branch: ContentOutlineBranch = {
        id: branchId,
        class: "branch",
        concept: parsed[i].concept,
        children: [],
      };
      i++;

      let subIdx = 0;
      while (i < parsed.length && parsed[i].indent >= 4) {
        const sub = parseSubbranch(parsed, i, {
          parentId: branchId,
          siblingIdx: subIdx,
        });
        branch.children.push(sub.node);
        i = sub.nextIndex;
        subIdx++;
      }
      branches.push(branch);
    } else if (parsed[i].indent === 0) {
      throw new Error(
        `Unexpected indent-0 line at position ${i}: only one center concept allowed`,
      );
    } else {
      throw new Error(
        `Invalid indentation at position ${i}: expected 2 spaces for branch, got ${parsed[i].indent}`,
      );
    }
  }
  return branches;
}

/**
 * Parses indented plain text into a structured content outline.
 *
 * Indent rules: center at 0, branches at 2, sub-branches at 4+2n.
 * Blank lines and lines starting with `#` are ignored.
 *
 * @param text - The raw indented text to parse.
 */
export function parseContentOutlineText(text: string): ContentOutline {
  const parsed = filterAndParseLines(text);
  const center = parsed[0];
  if (center.indent !== 0) {
    throw new Error("First line must be at indent 0 (center concept)");
  }
  return {
    schema: "omm.content_outline",
    version: 1,
    center: { id: "center", concept: center.concept },
    branches: parseBranches(parsed),
  };
}
