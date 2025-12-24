import { cn } from "@/lib/utils";

export function CameraReverseIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(className)}
        >
            <path d="M14 16.29V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2.5" />
            <path d="M12 11.71V9a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2.5" />
            <path d="m16 8-2.34 2.34" />
            <path d="m22 2-2.34 2.34" />
            <path d="M18 6h4v4" />
            <path d="M22 16.5 16 22l-4-4" />
        </svg>
    );
}
