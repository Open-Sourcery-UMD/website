"use client";

import { useState } from "react";

interface SelectMultipleQuestionProps {
  question: string;
  options: string[];
  maxSelected: number;
  isRequired?: boolean;
  value?: string[];
  onChange?: (value: string[]) => void;
}

const SelectMultipleQuestion: React.FC<SelectMultipleQuestionProps> = ({
  question,
  options,
  maxSelected,
  isRequired = false,
  value,
  onChange,
}) => {
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const [error, setError] = useState("");

  const isControlled = value !== undefined;
  const selected = isControlled ? value : internalSelected;

  function handleToggleOption(option: string) {
    const newSelected = selected.includes(option)
      ? selected.filter((s) => s !== option)
      : selected.length < maxSelected
      ? [...selected, option]
      : selected;

    if (isControlled) {
      onChange?.(newSelected);
    } else {
      setInternalSelected(newSelected);
    }
  }

  function runValidators() {
    // No custom validation required - component manages state internally
    setError("");
  }

  const isMaxReached = selected.length >= maxSelected;

  return (
    <div className="flex flex-col mb-10 text-black">
      <div className="flex text-m">
        {question}
        {isRequired && <span className="text-red-400">&nbsp;*</span>}
      </div>

      <div className="mt-4 space-y-3">
        {options.map((option) => {
          const isDisabled = isMaxReached && !selected.includes(option);

          return (
            <div key={option} className="flex items-center">
              <input
                type="checkbox"
                id={`${question}-${option}`}
                checked={selected.includes(option)}
                onChange={() => handleToggleOption(option)}
                onBlur={runValidators}
                disabled={isDisabled}
                className={`w-4 h-4 ${
                  isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
              />
              <label
                htmlFor={`${question}-${option}`}
                className={`ml-3 ${isDisabled ? "opacity-50 cursor-not-allowed text-gray-500" : "cursor-pointer"}`}
              >
                {option}
              </label>
            </div>
          );
        })}
      </div>

      {error && <p className="mt-2 text-red-400 text-xs">{error}</p>}
    </div>
  );
};

export default SelectMultipleQuestion;
