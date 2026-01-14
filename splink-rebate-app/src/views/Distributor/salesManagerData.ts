import {
  DistributorProgramDetail,
  ProgramListingCard
} from "@/types/ProgramTypes";

// Static data for Sales Manager programs
// Note: Add Haribo logo image to /public/logos/haribo.png for proper display
export const salesManagerProgramsData: ProgramListingCard[] = [
  {
    id: "haribo-void-closures",
    manufacturer: {
      id: 1,
      name: "Haribo",
      avatar:
        "https://dev-splink-s3.s3.us-east-2.amazonaws.com/761df89a-c977-41c4-abe2-f470c884ccc8-Haribo-logo.jpg", // Using placeholder image for now
      authorized: true
    },
    salesData: {
      purchaseVolume: {
        amount: 250,
        yoy: 15.5
      },
      totalSavings: {
        amount: 250,
        yoy: 12.3
      },
      totalOppSavings: {
        amount: 500
      },
      totalSalesRepSpiff: {
        amount: 250
      }
    },
    programs: [
      {
        overview: "Close 75% of total voids across your sales reps",
        paymentTerms: "Monthly",
        id: 1,
        programDetailId: 1,
        type: "Haribo Void Closures",
        rebateType: "fixed",
        criteria: "Void fill goal",
        complianceStatus: true,
        rebate: "$250",
        rebateValue: "$250",
        earnedRebate: 250,
        additionalInfo: {
          title: "Haribo Void Closures",
          info: "Close 75% of total voids across your sales reps",
          distributionTarget: {
            total: 250,
            completed: 190
          },
          totalSavings: {
            amount: 250,
            yoy: 12.3
          },
          description:
            "Earn $250 by closing 75% of voids across your sales reps"
        },
        startDate: "01-01-2025",
        endDate: "12-31-2025",
        programType: "VOID_FILL",
        programLine: "Void Closures",
        programName: "Haribo Void Closures Program"
      }
    ],
    products: [],
    programPaymentTerm: "Monthly",
    isEnrolled: true,
    startDate: "01-01-2025",
    endDate: "12-31-2025"
  }
];

// Static data for Haribo program detail
export const hariboProgramDetail: DistributorProgramDetail = {
  id: "haribo-void-closures",
  manufacturer: {
    id: 1,
    name: "Haribo",
    avatar:
      "https://dev-splink-s3.s3.us-east-2.amazonaws.com/761df89a-c977-41c4-abe2-f470c884ccc8-Haribo-logo.jpg",
    authorized: true
  },
  salesData: {
    purchaseVolume: {
      amount: 125000,
      yoy: 15.5
    },
    totalSavings: {
      amount: 250,
      yoy: 12.3
    },
    totalOppSavings: {
      amount: 500
    },
    totalSalesRepSpiff: {
      amount: 250
    }
  },
  programs: {
    salesRep: [
      {
        type: "Haribo Void Closures",
        rebate: 250,
        rebateType: "fixed",
        overview: "Close 75% of total voids across your sales reps",
        paymentTerms: "Monthly",
        storesCompliant: 15,
        totalEarnings: {
          amount: 250
        },
        startDate: "01-01-2025",
        endDate: "12-31-2025",
        programType: "VOID_FILL",
        programLine: "Void Closures",
        programName: "Haribo Void Closures Program"
      }
    ],
    distributor: []
  },
  products: [
    {
      id: 1,
      name: "SOUR JACKS WEDGES WATERMELON PP 3/5.99 24CT",
      extraInfo: "1242945"
    },
    {
      id: 2,
      name: "SEASONAL WELCHS STRAWBERRY SNOWBALLS 12CT",
      extraInfo: "2566446"
    },
    {
      id: 3,
      name: "CHRISTMAS WELCHS MIXD FRUIT SNACK 12CT",
      extraInfo: "2878786"
    },
    {
      id: 4,
      name: "SP ORIG GUMMI FUN MIX GUMMI PARTY 5OZ",
      extraInfo: "3003823"
    }
  ],
  purchasedProducts: [],
  categorizedProducts: {
    "Tier 1": {
      requiredProducts: [
        {
          id: 1,
          name: "SOUR JACKS WEDGES WATERMELON PP 3/5.99 24CT",
          internalCode: "1242945"
        },
        {
          id: 2,
          name: "SEASONAL WELCHS STRAWBERRY SNOWBALLS 12CT",
          internalCode: "2566446"
        },
        {
          id: 3,
          name: "CHRISTMAS WELCHS MIXD FRUIT SNACK 12CT",
          internalCode: "2878786"
        },
        {
          id: 4,
          name: "SP ORIG GUMMI FUN MIX GUMMI PARTY 5OZ",
          internalCode: "3003823"
        }
      ],
      purchasedProducts: []
    }
  }
};

// Progress tracker data for Haribo program
export const hariboProgressData = {
  progressTrack: {
    completed: 190,
    total: 250,
    label: "(76%) Total Voids"
  },
  earningsOpportunity: {
    amount: 5055.5
  }
};
