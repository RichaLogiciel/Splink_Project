import { SHOW_PROGRAM_ON_TIMELINE_BASE } from "@/utils/constants";

const sectionTitles = ["Distributor Programs", "Store Programs", "Sales Reps"];

export default function ManufacturerProgramLoader() {
  return (
    <main className="loader">
      <div className="mb-4 flex flex-col md:flex-row justify-between gap-3">
        <div className="h-6 w-48 bg-gray-300 rounded animate-pulse mb-2" />
        <div className="flex gap-4 items-center">
          {SHOW_PROGRAM_ON_TIMELINE_BASE && (
            <div className="h-6 w-32 bg-gray-300 rounded animate-pulse" />
          )}
          <div className="h-6 w-36 bg-gray-300 rounded animate-pulse" />
          <div className="h-6 w-36 bg-gray-300 rounded animate-pulse" />
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {sectionTitles.map((title, idx) => (
          <div
            key={`${title}-${idx}`}
            className="w-full mb-6 rounded-lg p-4 bg-white"
          >
            <div className="h-4 w-48 bg-gray-300 rounded animate-pulse mb-6" />
            <div className="border-b mb-4" />
            <div className="flex flex-wrap gap-4 w-full">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex flex-col border rounded-lg p-4 w-full sm:w-[calc(50%-8px)] lg:w-[calc(33%-8px)] min-h-52 bg-white animate-pulse"
                >
                  <div className="flex gap-2 items-center mb-2">
                    <div className="h-6 w-32 bg-gray-300 rounded" />
                    <div className="h-6 w-16 bg-gray-300 rounded" />
                  </div>
                  <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
                  <div className="flex justify-between items-center my-2">
                    <div className="h-4 w-28 bg-gray-300 rounded" />
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 bg-gray-300 rounded-full" />
                      <div className="h-4 w-16 bg-gray-300 rounded" />
                    </div>
                  </div>
                  <div className="flex justify-between bg-gray-200 px-2 mb-4 rounded-md items-center w-full">
                    <div className="h-4 w-16 bg-gray-300 rounded" />
                    <div className="h-5 w-16 bg-gray-300 rounded" />
                  </div>
                  <div className="flex justify-between items-center w-full mt-auto">
                    <div>
                      <div className="h-3 w-16 bg-gray-300 rounded mb-1" />
                      <div className="h-4 w-20 bg-gray-300 rounded" />
                    </div>
                    <div>
                      <div className="h-3 w-16 bg-gray-300 rounded mb-1" />
                      <div className="h-4 w-20 bg-gray-300 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
