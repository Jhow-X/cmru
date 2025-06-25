import * as React from "react"
import { cn } from "@/lib/utils"
import { Search } from "lucide-react"

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (e: React.FormEvent) => void
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearch, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          className={cn(
            "flex h-9 w-full rounded-full border border-input bg-[#121826] px-4 pr-10 py-2 text-sm text-white ring-offset-background placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
        <button 
          type="submit" 
          onClick={(e) => onSearch?.(e)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-200"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    )
  }
)

SearchInput.displayName = "SearchInput"

export { SearchInput }