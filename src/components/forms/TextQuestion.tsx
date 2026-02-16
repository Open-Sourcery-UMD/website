"use client";

import { useState } from "react";

interface TextQuestionProps {
  question: string;
  placeholder: string;
  maxLength: number;
  isRequired?: boolean;
  validators?: ((input: string) => string)[];
  asyncValidators?: ((input: string) => Promise<string | null>)[];
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
}

const TextQuestion: React.FC<TextQuestionProps> = ({
  question,
  placeholder,
  maxLength,
  isRequired = false,
  validators = [],
  asyncValidators = [],
  value,
  onChange,
  type = "text"
}) => {
  const [internalInput, setInternalInput] = useState("");
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const isControlled = value !== undefined;
  const inputValue = isControlled ? value : internalInput;

  async function runValidators() {
    setIsValidating(true);
    let isValid = true;

    if (isRequired && inputValue.length === 0) {
      isValid = false;
      setError("This question is required.");
      setIsValidating(false);
      return;
    }

    for (const validator of validators) {
      const res = validator(inputValue);
      if (res) {
        isValid = false;
        setError(res);
        setIsValidating(false);
        return;
      }
    }

    // Run async validators
    if (asyncValidators.length > 0 && inputValue.length > 0) {
      for (const asyncValidator of asyncValidators) {
        try {
          const res = await asyncValidator(inputValue);
          if (res) {
            isValid = false;
            setError(res);
            setIsValidating(false);
            return;
          }
        } catch (err) {
          console.error("Async validator error:", err);
          setError("Validation error. Please try again.");
          setIsValidating(false);
          return;
        }
      }
    }

    if (isValid) {
      setError("");
    }

    setIsValidating(false);
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
            { question }{ isRequired && <span className="text-red-400">&nbsp;*</span>}
          </div>

          <div className="relative flex items-center">
            <input
              type={type}
              className={`mt-1 w-60 p-2 rounded-xl border-2 ${error ? "border-red-500" : "border-gray-300"}`}
              value={inputValue}
              placeholder={placeholder}
              maxLength={maxLength}
              onBlur={runValidators}
              onChange={(event) => handleChange(event.target.value)}
              disabled={isValidating}
            />

            {/* Loading spinner during async validation */}
            {isValidating && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-1">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            )}
          </div>

          <p className="absolute mt-1 text-red-400 text-xs">
            { error }
          </p>
        </label>
    </div>
  );
}

export default TextQuestion;