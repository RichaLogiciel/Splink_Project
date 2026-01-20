import { SHOW_PROGRAM_ON_TIMELINE_BASE } from "@/utils/constants";
import { getUserServer } from "@/utils/getUserServer";
import {
  isDistributor,
  isDistributorAdmin,
  isDistributorSalesRep
} from "@/utils/rolesConditions";
import Link from "next/link";

export default async function DistributorProgramLoader() {
  const user = await getUserServer();
  const isDistAdmin = isDistributorAdmin(user?.role || "");
  const isSalesRep = isDistributorSalesRep(user?.role || "");
  const isNotSalesRep = isDistributor(user?.role || "") && !isSalesRep;

  return (
    <main className="loader">
      <div className="programOverview">
        <div
          className={`flex flex-col md:flex-row justify-between gap-3 ${isNotSalesRep ? "mb-2" : "mb-5"}`}
        >
          <div className="h-6 w-40 bg-gray-300 rounded animate-pulse mb-2" />
          {(isDistAdmin || isSalesRep) && (
            <div className="flex gap-4 items-center">
              <div className="h-7 w-36 bg-gray-300 rounded animate-pulse" />
            </div>
          )}
        </div>
        <div className="text-left text-sm text-filter-light font-medium font-inter">
          {isNotSalesRep && (
            <div className="py-5">
              <div
                className={`min-h-9 flex justify-between text-base border-b pb-2 ${SHOW_PROGRAM_ON_TIMELINE_BASE ? "pb-2" : ""}`}
              >
                <div className="flex gap-8">
                  <div className="relative animate-pulse">
                    <Link
                      prefetch
                      className="pb-3 font-medium"
                      href={"/app/programs/store/"}
                    >
                      <div className="mt-1 h-5 bg-gray-300 w-32 rounded"></div>
                    </Link>
                  </div>
                  <div className="relative animate-pulse">
                    <Link
                      prefetch
                      className="pb-3 font-medium"
                      href={"/app/programs/"}
                    >
                      <div className="mt-1 h-5 bg-gray-300 w-32 rounded"></div>
                    </Link>
                  </div>
                </div>
                {SHOW_PROGRAM_ON_TIMELINE_BASE && (
                  <div className="mt-1 h-7 bg-gray-300 w-32 rounded"></div>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-4 mt-2">
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <div
                key={index}
                className="rounded-lg p-4 bg-white w-full sm:w-[calc(50%-8px)] lg:w-[calc(33%-8px)] sm:min-h-80 animate-pulse"
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
        </div>
      </div>
    </main>
  );
}
