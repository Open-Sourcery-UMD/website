"use client";

import { useState, useRef, useEffect } from "react";

interface SearchSelectQuestionProps {
  question: string;
  placeholder: string;
  options: string[];
  minSelected: number;
  maxSelected: number;
  value?: string[];
  onChange?: (value: string[]) => void;
}

const SearchSelectQuestion: React.FC<SearchSelectQuestionProps> = ({
  question,
  placeholder,
  options,
  minSelected,
  maxSelected,
  value,
  onChange,
}) => {
  const [input, setInput] = useState("");
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const [filteredOptions, setFilteredOptions] = useState<string[]>(options);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isControlled = value !== undefined;
  const selected = isControlled ? value : internalSelected;

  useEffect(() => {
    const filtered = options.filter(
      (option) =>
        option.toLowerCase().includes(input.toLowerCase()) &&
        !selected.includes(option)
    );
    setFilteredOptions(filtered);
  }, [input, options, selected]);

  function handleSelectOption(option: string) {
    const newSelected = selected.length < maxSelected && !selected.includes(option)
      ? [...selected, option]
      : selected;

    if (isControlled) {
      onChange?.(newSelected);
    } else {
      setInternalSelected(newSelected);
    }

    setInput("");
    setShowSuggestions(false);
  }

  function handleRemoveOption(option: string) {
    const newSelected = selected.filter((s) => s !== option);

    if (isControlled) {
      onChange?.(newSelected);
    } else {
      setInternalSelected(newSelected);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && filteredOptions.length > 0) {
      e.preventDefault();
      handleSelectOption(filteredOptions[0]);
    }
  }

  function runValidators() {
    if (selected.length < minSelected) {
      setError(`Please select at least ${minSelected} item${minSelected !== 1 ? "s" : ""}.`);
    } else {
      setError("");
    }
  }

  const isSuggestionsDisabled = selected.length >= maxSelected;
  const placeholderText =
    minSelected > 0 && selected.length === 0
      ? `Select at least ${minSelected}`
      : placeholder;

  return (
    <div className="flex flex-col mb-10 text-black">
      <label className="relative">
        <div className="flex">
          {question}
          {minSelected > 0 && <span className="text-red-400">&nbsp;*</span>}
        </div>

        <input
          ref={inputRef}
          type="text"
          className={`mt-1 p-2 rounded-xl border-2 w-full ${
            error ? "border-red-500" : "border-gray-300"
          }`}
          placeholder={placeholderText}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(!isSuggestionsDisabled)}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 200);
            runValidators();
          }}
          onKeyDown={handleKeyDown}
          disabled={isSuggestionsDisabled && selected.length === 0 && input === ""}
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && !isSuggestionsDisabled && (
          <div className="absolute top-15 left-0 right-0 z-20">
            <div className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">

              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onMouseDown={() => handleSelectOption(option)}
                    className="w-full text-left px-4 py-3 flex items-center justify-between group transition-all duration-150 hover:bg-ycs-blue/10 active:scale-[0.99]"
                  >
                    <span className="text-sm font-medium text-gray-800 group-hover:text-ycs-blue">
                      {option}
                    </span>

                    <span className="text-xs text-gray-400 group-hover:text-ycs-blue transition">
                      + Add
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-4 text-sm text-gray-400 text-center">
                  No matching results
                </div>
              )}
            </div>
          </div>
        )}


        {/* Selected Bubbles */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {selected.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 bg-ycs-blue/20 text-black px-3 py-1 rounded-full text-sm"
              >
                {item}
                <button
                  type="button"
                  onClick={() => handleRemoveOption(item)}
                  className="ml-1 hover:text-red-500 font-bold"
                  aria-label={`Remove ${item}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-2 text-red-400 text-xs">
          {error}
        </p>
      </label>
    </div>
  );
};

export default SearchSelectQuestion;
