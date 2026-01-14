const RecommendedProducts = () => {
  return (
    <div className="rounded-lg bg-white w-full p-6 mt-6">
      <div className="h-6 bg-gray-300 rounded w-48 animate-pulse mb-4"></div>
      <div className="text-xs">
        <div className="h-4 bg-gray-300 rounded w-24 animate-pulse mb-2"></div>
        <ul>
          {[1, 2, 3, 4, 5].map((item) => (
            <li
              key={item}
              className="py-3.5 last:border-0 last:pb-0 border-b border-border-gray"
            >
              <div className="h-4 bg-gray-300 rounded w-48 animate-pulse"></div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
export default RecommendedProducts;
