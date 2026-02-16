"use client";

import { useState } from "react";

interface MultipleChoiceQuestionProps {
  question: string;
  options: string[];
  isRequired?: boolean;
  value?: string | null;
  onChange?: (value: string) => void;
}

const MultipleChoiceQuestion: React.FC<MultipleChoiceQuestionProps> = ({
  question,
  options,
  isRequired = false,
  value,
  onChange,
}) => {
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isControlled = value !== undefined;
  const selected = isControlled ? value : internalSelected;

  function runValidators() {
    if (isRequired && !selected) {
      setError("This question is required.");
    } else {
      setError("");
    }
  }

  const handleChange = (newValue: string) => {
    if (isControlled) {
      onChange?.(newValue);
    } else {
      setInternalSelected(newValue);
    }
  };

  return (
    <div className="flex flex-col mb-10 text-black">
      <label className="relative">
        <div className="flex">
          {question}
          {isRequired && <span className="text-red-400">&nbsp;*</span>}
        </div>

        <div className="mt-4 space-y-3">
          {options.map((option) => (
            <div key={option} className="flex items-center">
              <input
                type="radio"
                id={`${question}-${option}`}
                name={question}
                value={option}
                checked={selected === option}
                onChange={(e) => handleChange(e.target.value)}
                onBlur={runValidators}
                className="w-4 h-4 cursor-pointer"
              />
              <label
                htmlFor={`${question}-${option}`}
                className="ml-3 cursor-pointer"
              >
                {option}
              </label>
            </div>
          ))}
        </div>

        <p className="mt-2 text-red-400 text-xs">
          {error}
        </p>
      </label>
    </div>
  );
};

export default MultipleChoiceQuestion;
