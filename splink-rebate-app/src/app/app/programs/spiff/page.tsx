import SpiffProgramsPage from "@/views/SalesRep/spiffPrograms";

interface SpiffProgramsPageProps {
  searchParams: {
    warehouseId: string;
    programTimeline: string;
  };
}

const SpiffPage = ({ searchParams }: SpiffProgramsPageProps) => {
  return <SpiffProgramsPage searchParams={searchParams} />;
};

export default SpiffPage;
