import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges Tailwind class names while resolving conflicts (later class wins).
 * Combines `clsx` (conditional class composition) with `tailwind-merge`
 * (intelligent Tailwind conflict resolution).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
