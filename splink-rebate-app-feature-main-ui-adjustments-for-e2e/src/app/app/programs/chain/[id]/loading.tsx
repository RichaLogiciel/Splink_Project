import StoreProgramDetailTabs from "@/components/skeletons/StoreProgramDetailTabs";
import StoreProgramDetailTopInsights from "@/components/skeletons/StoreProgramDetailTopInsights";

export default function Loading() {
  return (
    <main className="loader">
      <div className="mb-4 flex sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div className="flex items-center">
          <div className="icons flex">
            <div className="w-6 h-6 bg-gray-300 rounded animate-pulse"></div>
            <div className="seperater min-h-7 border ml-3 mr-4 border-border-gray"></div>
          </div>
          <div className="flex gap-3 items-center">
            <div className="avatar w-9 h-9 bg-gray-300 rounded-md animate-pulse"></div>
            <div className="h-6 bg-gray-300 rounded w-48 animate-pulse"></div>
          </div>
        </div>
      </div>
      <StoreProgramDetailTopInsights />
      <StoreProgramDetailTabs />
    </main>
  );
}
