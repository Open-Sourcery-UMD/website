"use client";

import { ReactNode, useState } from "react";

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
  /** Tighter spacing and a full-width input, for short forms like log-in */
  compact?: boolean;
  /**
   * A note shown under the field once it passes validation - for advice that
   * shouldn't block the form, unlike a validator's error
   */
  asyncHint?: (input: string) => Promise<ReactNode | null>;
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
  type = "text",
  compact = true,
  asyncHint,
}) => {
  const [internalInput, setInternalInput] = useState("");
  const [error, setError] = useState("");
  const [hint, setHint] = useState<ReactNode | null>(null);
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
      if (asyncHint && inputValue.length > 0) {
        try {
          setHint(await asyncHint(inputValue));
        } catch (err) {
          console.error("Async hint error:", err);
        }
      }
    }

    setIsValidating(false);
  }

  const handleChange = (newValue: string) => {
    // A hint about the old value no longer applies
    setHint(null);
    if (isControlled) {
      onChange?.(newValue);
    } else {
      setInternalInput(newValue);
    }
  };

  return (
    <div className={`flex flex-col text-black ${compact ? "mb-5" : "mb-10"}`}>
        <label className="relative text-m">
          <div className="flex">
            { question }{ isRequired && <span className="text-red-400">&nbsp;*</span>}
          </div>

          <div className="relative flex items-center">
            <input
              type={type}
              className={`mt-1 p-2 rounded-xl border-2 ${compact ? "w-full" : "w-60"} ${error ? "border-red-500" : "border-gray-300"}`}
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

        {hint && !error && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {hint}
          </div>
        )}
    </div>
  );
}

export default TextQuestion;