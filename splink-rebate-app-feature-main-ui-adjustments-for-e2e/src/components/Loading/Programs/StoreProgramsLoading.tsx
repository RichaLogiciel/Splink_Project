export default function StoreProgramsLoading({ numberOfItems = 6 }) {
  return (
    <div className="flex flex-wrap gap-4 bg-common-bg">
      {Array.from({ length: numberOfItems || 6 }, (_, index) => (
        <div
          key={index}
          className="rounded-lg p-4 w-full bg-white sm:w-[calc(50%-8px)] lg:w-[calc(33%-8px)] sm:min-h-80"
        >
          <div className="flex gap-3 items-center">
            <div className="w-[52px] h-[52px] bg-gray-300 rounded-md"></div>
            <div className="w-1/2 h-6 bg-gray-300 rounded"></div>
          </div>
          <div className="saleinfo bg-gray-200 py-2 px-4 mt-4 rounded-md flex gap-4 items-center">
            <div className="info w-1/2">
              <div className="h-4 bg-gray-300 w-24 rounded"></div>
              <div className="mt-1 h-5 bg-gray-300 w-16 rounded"></div>
            </div>
            <div className="seperator min-h-9 w-[1px] bg-gray-300"></div>
            <div className="info w-1/2">
              <div className="h-4 bg-gray-300 w-24 rounded"></div>
              <div className="mt-1 h-5 bg-gray-300 w-16 rounded"></div>
            </div>
          </div>
          <div className="mt-4 mb-2 max-h-48 overflow-y-auto">
            <div className="flex justify-between p-3 border-border-gray border-b animate-pulse">
              <div className="h-4 bg-gray-300 w-24 rounded"></div>
              <div className="h-4 bg-gray-300 w-16 rounded"></div>
            </div>
            <div className="flex justify-between p-3 border-border-gray border-b animate-pulse">
              <div className="h-4 bg-gray-300 w-24 rounded"></div>
              <div className="h-4 bg-gray-300 w-16 rounded"></div>
            </div>
            <div className="flex justify-between p-3 border-border-gray border-b animate-pulse">
              <div className="h-4 bg-gray-300 w-24 rounded"></div>
              <div className="h-4 bg-gray-300 w-16 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
