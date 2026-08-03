import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges tailwind class names, resolving conflicts with tailwind-merge. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
