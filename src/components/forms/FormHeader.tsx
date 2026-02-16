import { ReactNode } from "react";

interface FormHeaderProps {
  title: string;
  confirmationPage: ReactNode;
  currPage: number;
  pageCount: number;
  sectionLabels: string[];
}

const FormHeader: React.FC<FormHeaderProps> = ({
  title,
  confirmationPage,
  currPage,
  pageCount,
  sectionLabels
}) => {
  const isConfirmation = currPage === pageCount;
  const showProgress = pageCount > 1 && sectionLabels.length > 1;

  if (isConfirmation) {
    return (
      <div className="w-full flex justify-center px-4 mt-8">
        <div className="w-full max-w-4xl bg-white rounded-tr-2xl rounded-tl-2xl shadow-xl p-10">
          {confirmationPage}
        </div>
      </div>
    );
  }

  const currentLabel =
    sectionLabels[currPage - 1] || "";

  return (
    <div className="w-full flex justify-center px-4 mt-8">
      <div className="w-full max-w-4xl bg-white rounded-tr-2xl rounded-tl-2xl shadow-[0_0_10px_0_white] p-8 md:p-10">
        
        {/* Title */}
        <h1 className="text-3xl font-semibold text-gray-900">
          {title}
        </h1>

        {/* Current Section Label */}
        {showProgress && (
          <div className="mt-2 text-sm text-gray-500">
            {currentLabel}
          </div>
        )}

        {/* Progress Indicator */}
        {showProgress && (
          <div className="mt-6">
            <div className="flex items-center">
              {sectionLabels.map((label, index) => {
                const stepNumber = index + 1;
                const isCompleted = stepNumber < currPage;
                const isCurrent = stepNumber === currPage;

                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center relative"
                  >
                    {/* Line (left side) */}
                    {index !== 0 && (
                      <div
                        className={`absolute top-4 -left-1/2 w-full h-0.5 
                        ${stepNumber <= currPage
                          ? "bg-blue-600"
                          : "bg-gray-300"
                        }`}
                      />
                    )}

                    {/* Circle */}
                    <div
                      className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium z-10
                        ${
                          isCompleted
                            ? "bg-blue-600 text-white"
                            : isCurrent
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-300 text-gray-700"
                        }
                      `}
                    >
                      {stepNumber}
                    </div>

                    {/* Label */}
                    <div className="mt-2 text-xs text-center text-gray-600">
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormHeader;