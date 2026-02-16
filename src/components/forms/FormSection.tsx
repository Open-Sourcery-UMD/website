import React from "react";

interface FormSectionProps {
  children: any;
  onBack: () => void;
  onNext: () => void;
  submitText: string;
  errorMessage: string;
}

const FormSection: React.FC<FormSectionProps> = ({
  children,
  onBack,
  onNext,
  submitText,
  errorMessage
}) => {
  const hasSubmit = submitText && submitText.trim().length > 0;

  return (
    <div className="w-full flex justify-center px-4">
      <div className="w-full max-w-4xl bg-white rounded-br-2xl rounded-bl-2xl shadow-[0_0_10px_0_white] p-10 md:p-10">
        
        {/* Form Content */}
        <div className="">
          {children}
        </div>

        {/* Error Message */}
        {errorMessage && errorMessage.trim().length > 0 && (
          <div className="mt-6 ml-10 text-sm text-red-600 font-medium">
            {errorMessage}
          </div>
        )}

        {/* Buttons */}
        <div className="mt-8 flex justify-end gap-4">
          {hasSubmit ? (
            <>
              <button
                  type="button"
                  onClick={onBack}
                  className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                >
                  Back
                </button>

              <button
                type="button"
                onClick={onNext}
                className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              >
                {submitText}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
              >
                Back
              </button>
              <button
                type="button"
                onClick={onNext}
                className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              >
                Next
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormSection;