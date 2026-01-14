const StoreProgramDetailTopInsights = ({
  elementCount = 3
}: {
  elementCount?: number;
}) => {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-${elementCount} gap-[1rem] sm:gap-[1.5rem]`}
    >
      {Array.from({ length: elementCount }, (_, i) => i + 1).map((item) => (
        <div
          key={item}
          className="rounded-lg p-4 bg-white w-full h-[121px] flex-0 items-center"
        >
          <div className="flex justify-between mb-4 flex-col">
            <div className="flex gap-1.5 items-center">
              <div className="w-6 h-6 bg-gray-300 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div>
            </div>
          </div>
          <div className="flex justify-between mb-0 items-center">
            <div className="h-8 bg-gray-300 rounded w-16 animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );
};
export default StoreProgramDetailTopInsights;
