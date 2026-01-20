/**
 * Generates a unique key for a program based on its properties
 */
export const getProgramKey = (program: any): string => {
  return `${program.rebate}-${program.programName}-${program.programType}-${program.type}-${program.overview}-${program.paymentTerms}`;
};

/**
 * Filters out duplicate programs based on specific properties
 */
export const filterDuplicatePrograms = <T extends Record<string, any>>(
  programs: T[]
): T[] => {
  return programs.filter((program, index, self) => {
    const programKey = getProgramKey(program);
    const firstIndex = self.findIndex((p) => getProgramKey(p) === programKey);
    return index === firstIndex;
  });
};

/**
 * Filters duplicate programs in manufacturer data
 */
export const filterDuplicateProgramsInManufacturers = <
  T extends { programs: Record<string, any>[] }
>(
  manufacturers: T[]
): T[] => {
  return manufacturers.map((manufacturer) => ({
    ...manufacturer,
    programs: filterDuplicatePrograms(manufacturer.programs)
  }));
};

/*
 * Formats the category SKU progress data if required products are provided
 * Otherwise, formats array data by splitting numbers and cleaning special characters
  @param data: Array of progress details
  @param required: String representing the required products
  @returns Array of formatted progress details
 */
export const formatCategorySKUProgress = (
  data: any[],
  required?: string
): any[] => {
  // If required products are provided, return the progress detail for the required products
  if (required) {
    const requiredProducts = required.includes(",")
      ? required
          .split(",")
          .reduce((acc: number, curr: string) => acc + Number(curr), 0)
      : Number(required);

    const progressDetail = data.find(
      (item) => item.graph?.SKUs?.total == requiredProducts
    );

    // Return the progress detail for the required products
    return [
      {
        sku: {
          completed: Number(progressDetail?.graph?.SKUs?.completed) || 0,
          total: Number(progressDetail?.graph?.SKUs?.total) || 0
        },
        label: progressDetail?.progressText?.[0] || ""
      }
    ];
  }

  return data.map((item) => {
    // Split the ratio into completed/total
    const [progressPart = "", ...labelParts] = item.split(" ");
    const [completed = "0", total = "0"] = progressPart.split("/");

    return {
      sku: {
        completed: Number(completed),
        total: Number(total)
      },
      label: labelParts.join(" ").trim()
    };
  });
};

export const getRebateValue = (rebate: string | undefined | number) => {
  if (!rebate) return "";

  if (typeof rebate === "number") {
    if (rebate == 0) return "NA";
    return rebate;
  } else if (typeof rebate === "string") {
    const rebateValue = Number(rebate.toString().replace(/[^\d.]/g, ""));

    if (rebateValue == 0) return "N/A";
  }

  return rebate;
};
