export type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | { [key: string]: boolean | undefined | null }
  | ClassValue[];

function toVal(mix: ClassValue): string {
  let str = "";
  if (typeof mix === "string" || typeof mix === "number") {
    str += mix;
  } else if (typeof mix === "object") {
    if (Array.isArray(mix)) {
      for (let k = 0; k < mix.length; k++) {
        if (mix[k]) {
          const y = toVal(mix[k]);
          if (y) {
            str && (str += " ");
            str += y;
          }
        }
      }
    } else if (mix !== null) {
      for (const k in mix) {
        if (mix[k]) {
          str && (str += " ");
          str += k;
        }
      }
    }
  }
  return str;
}

/**
 * Deterministically resolves property conflict groups (e.g. text sizes, colors, margins)
 * without requiring external runtime dependencies.
 */
function getConflictGroup(token: string): string | null {
  const lastColonIndex = token.lastIndexOf(":");
  const prefix = lastColonIndex >= 0 ? token.slice(0, lastColonIndex + 1) : "";
  const base = lastColonIndex >= 0 ? token.slice(lastColonIndex + 1) : token;

  // Font size utilities
  if (/^text-(xs|sm|base|lg|[2-9]?xl)$/.test(base)) return `${prefix}font-size`;
  // Text alignment
  if (/^text-(left|center|right|justify|start|end)$/.test(base)) return `${prefix}text-align`;
  // Text color
  if (/^text-(brand|gray|blue|red|green|yellow|slate|zinc|neutral|white|black)/.test(base)) return `${prefix}text-color`;
  // Background color
  if (/^bg-(brand|gray|blue|red|green|yellow|slate|zinc|neutral|white|black)/.test(base)) return `${prefix}bg-color`;
  // Font weight
  if (/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)/.test(base)) return `${prefix}font-weight`;
  // Border radius
  if (/^rounded(-.+)?$/.test(base)) return `${prefix}border-radius`;
  // Box shadow
  if (/^shadow(-.+)?$/.test(base)) return `${prefix}box-shadow`;
  // Padding & Margin
  if (/^p-\w+$/.test(base)) return `${prefix}p`;
  if (/^px-\w+$/.test(base)) return `${prefix}px`;
  if (/^py-\w+$/.test(base)) return `${prefix}py`;
  if (/^pt-\w+$/.test(base)) return `${prefix}pt`;
  if (/^pb-\w+$/.test(base)) return `${prefix}pb`;
  if (/^pl-\w+$/.test(base)) return `${prefix}pl`;
  if (/^pr-\w+$/.test(base)) return `${prefix}pr`;
  if (/^m-\w+$/.test(base)) return `${prefix}m`;
  if (/^mx-\w+$/.test(base)) return `${prefix}mx`;
  if (/^my-\w+$/.test(base)) return `${prefix}my`;
  if (/^mt-\w+$/.test(base)) return `${prefix}mt`;
  if (/^mb-\w+$/.test(base)) return `${prefix}mb`;
  if (/^ml-\w+$/.test(base)) return `${prefix}ml`;
  if (/^mr-\w+$/.test(base)) return `${prefix}mr`;
  // Dimensions
  if (/^max-w-\w+$/.test(base)) return `${prefix}max-w`;
  if (/^w-\w+$/.test(base)) return `${prefix}width`;
  if (/^h-\w+$/.test(base)) return `${prefix}height`;
  if (/^gap-\w+$/.test(base)) return `${prefix}gap`;
  if (/^gap-x-\w+$/.test(base)) return `${prefix}gap-x`;
  if (/^gap-y-\w+$/.test(base)) return `${prefix}gap-y`;
  if (/^grid-cols-\w+$/.test(base)) return `${prefix}grid-cols`;
  if (/^flex-(row|col|row-reverse|col-reverse)$/.test(base)) return `${prefix}flex-direction`;
  if (/^items-(start|end|center|baseline|stretch)$/.test(base)) return `${prefix}align-items`;
  if (/^justify-(start|end|center|between|around|evenly|normal)$/.test(base)) return `${prefix}justify-content`;

  return null;
}

export function cn(...inputs: ClassValue[]): string {
  let i = 0;
  let tmp: ClassValue;
  let rawStr = "";
  while (i < inputs.length) {
    if ((tmp = inputs[i++])) {
      const x = toVal(tmp);
      if (x) {
        rawStr && (rawStr += " ");
        rawStr += x;
      }
    }
  }

  if (!rawStr) return "";

  const tokens = rawStr.split(/\s+/).filter(Boolean);
  const groupMap = new Map<string, number>();
  const resolvedTokens: string[] = [];

  for (const token of tokens) {
    const group = getConflictGroup(token);
    if (group) {
      if (groupMap.has(group)) {
        const oldIndex = groupMap.get(group)!;
        resolvedTokens[oldIndex] = ""; // invalidate earlier conflicting token
      }
      groupMap.set(group, resolvedTokens.length);
      resolvedTokens.push(token);
    } else {
      resolvedTokens.push(token);
    }
  }

  return resolvedTokens.filter(Boolean).join(" ");
}
