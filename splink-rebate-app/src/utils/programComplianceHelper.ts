/**
 * Helper functions for program compliance calculations
 */

/**
 * Creates a map of program compliance data for quick lookups
 */
export const createComplianceMap = (complianceDetails: any[] = []) => {
  if (!complianceDetails?.length) {
    return new Map();
  }

  return new Map(complianceDetails.map((c: any) => [c.programDetailId, c]));
};

/**
 * Enhances programs with compliance data from a separate source
 */
export const getEnhancedPrograms = (
  programs: any[] = [],
  complianceDetails: any[] = []
) => {
  if (!programs?.length || !complianceDetails?.length) {
    return programs;
  }

  const complianceMap = createComplianceMap(complianceDetails);

  return programs.map((program: any) => {
    const compliance: any = complianceMap.get(program?.programDetailId);

    if (!compliance) {
      return program; // Return original program if no compliance data
    }

    // Enhance program with compliance data
    const completed = Number(compliance.qualifiedComliances ?? 0);
    const total = Number(compliance.totalEnrollments ?? 0);

    return {
      ...program,
      storeCompliance: {
        ...program.storeCompliance,
        completed,
        total
      }
    };
  });
};

/**
 * Calculates compliance totals from program data and compliance details
 */
export const calculateComplianceTotals = (
  programs: any[] = [],
  complianceDetails: any[] = []
) => {
  if (!programs?.length) {
    return { totalProgramEnrollments: 0, totalProgramCompliances: 0 };
  }

  // If we have compliance details, prioritize using those
  if (complianceDetails?.length) {
    console.log("Compliance details:", complianceDetails);
    // Use the compliance details API data
    const result = complianceDetails.reduce(
      (acc: any, compliance: any) => {
        const completed = Number(compliance.qualifiedComliances ?? 0);
        const total = Number(compliance.totalEnrollments ?? 0);

        acc.totalProgramEnrollments += total;
        acc.totalProgramCompliances += completed;
        return acc;
      },
      { totalProgramEnrollments: 0, totalProgramCompliances: 0 }
    );

    console.log("Calculated totals from compliance API:", result);
    return result;
  } else {
    // Fall back to program data if no compliance details
    const result = programs.reduce(
      (acc: any, program: any) => {
        acc.totalProgramEnrollments += Number(
          program.storeCompliance?.total ?? 0
        );
        acc.totalProgramCompliances += Number(
          program.storeCompliance?.completed ?? 0
        );
        return acc;
      },
      { totalProgramEnrollments: 0, totalProgramCompliances: 0 }
    );

    console.log("Calculated totals from program data:", result);
    return result;
  }
};
