import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * @function cn
 * @description A utility function to merge Tailwind CSS classes.
 * @param {...ClassValue[]} inputs - The class values to merge.
 * @returns {string} - The merged class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
