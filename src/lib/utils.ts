import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// ده اللي شادكن محتاجه
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ده اللي انت كنت حاطه للـ toast - سيبه زي ما هو
import { useToast, toast } from "@/hooks/use-toast"
export { useToast, toast }