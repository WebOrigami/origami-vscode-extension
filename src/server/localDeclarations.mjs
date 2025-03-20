import { ops } from "@weborigami/language";

/**
 * Given a position in source code, yield the set of local object or lambda
 * declarations that surround that position, working up toward the root of the
 * code.
 *
 * @typedef {@import("@weborigami/language").Position} PeggyPosition
 *
 * @param {Code} code
 * @param {PeggyPosition} peggyPosition
 */
export default function* localDeclarations(code, peggyPosition) {
  if (!Array.isArray(code) || code.location === undefined) {
    return;
  }

  const { location } = code;
  if (
    peggyPosition.line < location.start.line ||
    peggyPosition.line > location.end.line ||
    (peggyPosition.line === location.start.line &&
      peggyPosition.column < location.start.column) ||
    (peggyPosition.line === location.end.line &&
      peggyPosition.column > location.end.column)
  ) {
    // Position is outside of this code
    return;
  }

  // Which argument does the position fall within?
  for (const arg of code) {
    if (Array.isArray(arg)) {
      // If position is outside argument this will return immediately
      yield* localDeclarations(arg, peggyPosition);
    }
  }

  // Only yield object and lambda declarations
  const fn = code[0];
  if (fn === ops.object || fn === ops.lambda) {
    yield code;
  }
}
