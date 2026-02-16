"use client";

import { useState } from "react";

interface TextareaQuestionProps {
  question: string;
  placeholder: string;
  maxLength: number;
  minLength?: number;
  rows?: number;
  isRequired?: boolean;
  validators?: ((input: string) => string)[];
  value?: string;
  onChange?: (value: string) => void;
}

const TextareaQuestion: React.FC<TextareaQuestionProps> = ({
  question,
  placeholder,
  maxLength,
  minLength = 0,
  rows = 4,
  isRequired = false,
  validators = [],
  value,
  onChange,
}) => {
  const [internalInput, setInternalInput] = useState("");
  const [error, setError] = useState("");

  const isControlled = value !== undefined;
  const inputValue = isControlled ? value : internalInput;

  function runValidators() {
    if (isRequired && inputValue.length === 0) {
      setError("This question is required.");
      return;
    }

    if (minLength > 0 && inputValue.length > 0 && inputValue.length < minLength) {
      setError(`Must be at least ${minLength} characters.`);
      return;
    }

    for (const validator of validators) {
      const res = validator(inputValue);
      if (res) {
        setError(res);
        return;
      }
    }

    setError("");
  }

  const handleChange = (newValue: string) => {
    if (isControlled) {
      onChange?.(newValue);
    } else {
      setInternalInput(newValue);
    }
  };

  return (
    <div className="flex flex-col mb-10 text-black">
      <label className="relative text-m">
        <div className="flex">
          {question}{isRequired && <span className="text-red-400">&nbsp;*</span>}
        </div>

        <textarea
          className={`mt-1 w-full p-2 rounded-xl border-2 resize-y max-h-64 ${error ? "border-red-500" : "border-gray-300"}`}
          value={inputValue}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={rows}
          onBlur={runValidators}
          onChange={(event) => handleChange(event.target.value)}
        />

        <div className="flex justify-between mt-1">
          <p className="text-red-400 text-xs">
            {error}
          </p>
          <p className="text-gray-400 text-xs">
            {inputValue.length} / {maxLength}
          </p>
        </div>
      </label>
    </div>
  );
};

export default TextareaQuestion;
