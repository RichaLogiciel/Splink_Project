interface Product {
  name: string;
  image?: string;
  extraInfo?: string;
}

interface CoreProductsTableProps {
  products: Product[];
}

const CoreProductsTable: React.FC<CoreProductsTableProps> = ({ products }) => {
  return (
    <div className="mt-4">
      <div className="storeTable text-left text-sm text-filter-light font-medium font-inter">
        <div className="overflow-x-auto overflow-y-hidden">
          <table className="w-full border-collapse">
            <thead className="h-11 border-b text-heading-very-light text-xs">
              <tr>
                <th className="font-semibold px-2 sm:px-4 cursor-pointer min-w-56">
                  <span className="inline mr-2">Name</span>
                </th>
                <th className="font-semibold px-2 sm:px-4 min-w-56">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, productIndex) => (
                <tr
                  key={`${product.name}-${productIndex}`}
                  className="rounded-lg mt-2 product-info text-[#131315]"
                >
                  <td className="px-2 sm:px-4 py-2 font-semibold text-sm leading-none">
                    {product.name}
                  </td>
                  <td className="px-2 sm:px-4 py-2 font-normal text-sm leading-none">
                    {product.extraInfo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CoreProductsTable;
