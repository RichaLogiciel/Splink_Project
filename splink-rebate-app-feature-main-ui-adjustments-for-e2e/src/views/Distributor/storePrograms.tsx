// Import Components

// Import Types
import StoreProgramsTab from "@/components/Tabs/StoreProgramsTab";

const StoreProgramsPage = async () => {
  return (
    <div className="storeProgramOverview">
      <h2 className="mb-4 text-lg font-semibold">Store Programs</h2>
      <div className="text-left text-sm text-filter-light font-medium font-inter">
        <StoreProgramsTab />
      </div>
    </div>
  );
};

export default StoreProgramsPage;
