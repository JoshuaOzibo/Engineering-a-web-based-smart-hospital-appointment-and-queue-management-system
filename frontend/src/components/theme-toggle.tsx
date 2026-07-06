import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showText?: boolean;
}

export function ThemeToggle({ className, showText = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={cn(
        "relative inline-flex items-center justify-center rounded-xl p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 focus:outline-none transition-all duration-300 shadow-soft border border-border/50 backdrop-blur-sm bg-card/40 cursor-pointer",
        className,
      )}
      aria-label="Toggle theme"
    >
      <div className="relative size-5 flex items-center justify-center overflow-hidden">
        {/* Sun Icon */}
        <Sun
          className={cn(
            "size-5 absolute transition-all duration-500 transform text-amber-500",
            theme === "dark" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0",
          )}
        />
        {/* Moon Icon */}
        <Moon
          className={cn(
            "size-5 absolute transition-all duration-500 transform text-indigo-500",
            theme === "dark" ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
          )}
        />
      </div>
      {showText && (
        <span className="ml-2.5 text-xs font-semibold select-none">
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </button>
  );
}
