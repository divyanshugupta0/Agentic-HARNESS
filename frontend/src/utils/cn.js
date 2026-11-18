/**
 * Utility for conditionally merging class name strings
 * @param  {...any} classes - Class name values, booleans, or objects
 * @returns {string} Clean joined class string
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ').trim();
}
