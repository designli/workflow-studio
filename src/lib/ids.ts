import { customAlphabet } from "nanoid";

// URL-safe, no look-alike characters. 12 chars is plenty for a company library.
export const newId = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 12);

export const ID_PATTERN = /^[a-z0-9_-]{4,40}$/i;
export function isValidId(id: unknown): id is string {
  return typeof id === "string" && ID_PATTERN.test(id);
}
