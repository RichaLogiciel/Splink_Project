interface TopSellingProductsProps {
  selectedProductsCount: number;
}

const TopSellingProducts = ({
  selectedProductsCount = 6
}: TopSellingProductsProps) => {
  return (
    <div className="storeTable overflow-x-auto text-left text-sm text-filter-light font-medium font-inter">
      <div className="rounded-lg p-4 bg-white h-full">
        <div className="flex flex-col">
          <div className="text-base font-semibold">Product Rankings</div>
        </div>

        <div className="flex-1 min-h-0 max-h-80 flex flex-col">
          <div className="flex-shrink-0">
            <table className="w-full border-collapse">
              <thead className="h-11 border-b text-heading-very-light text-xs bg-white">
                <tr>
                  <th className="w-[45%] font-medium pr-4">Name</th>
                  <th className="w-1/6 font-medium pr-4 text-right">Sales</th>
                  <th className="w-1/6 font-medium pr-4 text-end">Units</th>
                  <th className="w-1/6 font-medium pr-4 text-right">
                    % of Stores
                  </th>
                </tr>
              </thead>
            </table>
          </div>
          <div className="overflow-y-auto flex-1">
            <table className="w-full border-collapse">
              <tbody className="divide-y">
                {Array.from({ length: selectedProductsCount }).map(
                  (_, index) => (
                    <tr
                      key={index}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="w-3/6 pr-4 py-3 font-medium">
                        <p className="w-64 h-6 bg-gray-300 rounded animate-pulse"></p>
                      </td>
                      <td className="w-1/6 pr-4 py-3 font-medium relative">
                        <p className="w-12 h-6 bg-gray-300 rounded animate-pulse right-[0px] absolute top-1/2 -translate-y-1/2"></p>
                      </td>
                      <td className="w-1/6 pr-4 py-3 font-medium relative">
                        <p className="w-16 h-6 bg-gray-300 rounded animate-pulse right-[10px] absolute top-1/2 -translate-y-1/2"></p>
                      </td>
                      <td className="w-1/6 pr-4 py-3 font-medium relative">
                        <p className="w-16 h-6 bg-gray-300 rounded animate-pulse right-[10px] absolute top-1/2 -translate-y-1/2"></p>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
export default TopSellingProducts;
