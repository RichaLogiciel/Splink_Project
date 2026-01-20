"use client";
import React, {
  SelectHTMLAttributes,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectBoxProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  options: Option[];
  className?: string;
  placeholder?: string;
}

const SearchableSelectBox = forwardRef<
  HTMLDivElement,
  SearchableSelectBoxProps
>(
  (
    {
      options,
      className,
      value,
      onChange,
      placeholder = "Search...",
      disabled = false,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      function onDocClick(e: MouseEvent) {
        if (!containerRef.current) return;
        if (containerRef.current.contains(e.target as Node)) return;
        setIsOpen(false);
      }
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    useEffect(() => {
      if (disabled && isOpen) {
        setIsOpen(false);
      }
      if (isOpen && !disabled) {
        setTimeout(() => inputRef.current?.focus(), 0);
      } else {
        setSearchTerm("");
      }
    }, [isOpen, disabled]);

    const normalized = (s: string) => s.toLowerCase().trim();
    const filteredOptions = useMemo(() => {
      const term = normalized(searchTerm);
      if (!term) return options;
      return options.filter((o) => normalized(o.label).includes(term));
    }, [options, searchTerm]);

    const selectedLabel = useMemo(() => {
      const found = options.find((o) => o.value === value);
      return found ? found.label : "";
    }, [options, value]);

    const handleSelect = (opt: Option) => {
      const syntheticEvent = {
        target: { value: opt.value }
      } as unknown as React.ChangeEvent<HTMLSelectElement>;
      onChange && onChange(syntheticEvent);
      setIsOpen(false);
    };

    return (
      <div ref={containerRef} className={`relative ${className || ""}`}>
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          className={`w-full rounded-md border border-border-gray px-3 py-2 text-left ${
            disabled
              ? "bg-gray-100 cursor-not-allowed opacity-60"
              : "cursor-pointer"
          }`}
          onClick={() => !disabled && setIsOpen((v) => !v)}
        >
          <span className="block truncate">{selectedLabel || "Select"}</span>
        </button>
        {isOpen && !disabled && (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-border-gray bg-white shadow-sm">
            <div className="p-2 border-b border-border-gray">
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-md border border-border-gray px-3 py-2 outline-none"
              />
            </div>
            <ul className="max-h-56 overflow-auto py-1">
              {filteredOptions.map((opt, idx) => (
                <li
                  key={`${opt.value}-${idx}`}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-50 ${opt.value === value ? "bg-gray-100" : ""}`}
                  onClick={() => handleSelect(opt)}
                >
                  {opt.label}
                </li>
              ))}
              {filteredOptions.length === 0 && (
                <li className="px-3 py-2 text-sm text-gray-500">No matches</li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  }
);

SearchableSelectBox.displayName = "SearchableSelectBox";

export default SearchableSelectBox;
