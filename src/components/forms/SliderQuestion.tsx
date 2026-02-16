"use client";

import { useState } from "react";

interface SliderQuestionProps {
  question: string;
  minimum: number;
  maximum: number;
  value?: number;
  onChange?: (value: number) => void;
}

const SliderQuestion: React.FC<SliderQuestionProps> = ({
  question,
  minimum,
  maximum,
  value: controlledValue,
  onChange,
}) => {
  const [internalValue, setInternalValue] = useState<number>(Math.round((minimum + maximum) / 2));
  const [error, setError] = useState("");

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  function runValidators() {
    setError("");
  }

  const percentage = ((value - minimum) / (maximum - minimum)) * 100;

  return (
    <div className="flex flex-col mb-10 text-black">
      <label className="relative">
        <div className="flex text-m">
          {question}
        </div>

        <div className="mt-4">
          {/* Slider Container */}
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={minimum}
              max={maximum}
              value={value}
              onChange={(e) => {
                const newVal = Number(e.target.value);
                if (isControlled) {
                  onChange?.(newVal);
                } else {
                  setInternalValue(newVal);
                }
              }}
              onBlur={runValidators}
              className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-ycs-blue"
            />
          </div>

          {/* Value Display */}
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {minimum}
            </span>
            <div className="text-center">
              <div className="text-2xl font-semibold text-ycs-blue">
                {value}
              </div>
              <div className="text-xs text-gray-500">
                {minimum} - {maximum}
              </div>
            </div>
            <span className="text-sm text-gray-600">
              {maximum}
            </span>
          </div>

          {/* Progress Indicator */}
          <div className="mt-3 w-full bg-gray-200 rounded-full h-1">
            <div
              className="bg-ycs-blue h-1 rounded-full transition-all duration-200"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>

        <p className="mt-2 text-red-400 text-xs">
          {error}
        </p>
      </label>
    </div>
  );
};

export default SliderQuestion;
