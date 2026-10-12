import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { v7 as uuidv7 } from "uuid";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const generateUUID = uuidv7;
