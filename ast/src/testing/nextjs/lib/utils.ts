import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Merge class names conditionally
// Accepts any number of class values
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
