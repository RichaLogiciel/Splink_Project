import RecommendedProducts from "./RecommendedProducts";

const StoreProgramDetailTabs = () => {
  return (
    <div className="mt-4 sm:mt-7">
      <div className="customTabs px-[0px] py-[0px] font-medium text-heading-light">
        <div className="product-list-header flex justify-between">
          <div className="tab-label-container min-h-9 tab-labels flex gap-8 text-base">
            {[1, 2, 3].map((item) => (
              <div key={item} className="relative">
                <div className="h-6 bg-gray-300 rounded w-24 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="tab-content border-t py-6">
          <div className="rounded-lg p-4 bg-white w-full p-6">
            <div className="h-6 bg-gray-300 rounded w-48 animate-pulse mb-4"></div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="h-11 border-b text-heading-very-light text-xs">
                  <tr>
                    {[1, 2, 3, 4].map((item) => (
                      <th
                        key={item}
                        className="font-normal min-w-24 px-2 sm:px-4"
                      >
                        <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2].map((item) => (
                    <tr
                      key={item}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                    >
                      {[1, 2, 3, 4].map((item) => (
                        <td key={item} className="px-2 sm:px-4 py-3">
                          <div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <RecommendedProducts />
        </div>
      </div>
    </div>
  );
};
export default StoreProgramDetailTabs;
