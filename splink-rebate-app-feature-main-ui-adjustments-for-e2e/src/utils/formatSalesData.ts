// Function to convert month number (1-12) to abbreviated month name (Jan - Dec)
const monthNumberToName = (monthNumber: number): string => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];

  // Return the corresponding abbreviated month name, default to empty string if invalid number
  return months[monthNumber - 1] || "";
};

// Function to format chart data: converts salePeriod to abbreviated month name and total_stores to number
export const formatChartData = (data: any[], groupByDays: boolean): any[] => {
  // Ensure data is an array
  if (!Array.isArray(data)) {
    console.error("Expected data to be an array, but got", typeof data);
    return []; // Return an empty array or handle the case as needed
  }

  // Create an object to hold combined sales data by month
  const aggregatedData: { [key: string]: number } = {};
  const aggregatedSalesData: { [key: string]: number } = {};

  // Loop through the data and aggregate total_stores by salePeriod
  data.forEach((item) => {
    if (item && item.salePeriod && item.total_stores != undefined) {
      const month = groupByDays
        ? item.salePeriod
        : monthNumberToName(parseInt(item.salePeriod));
      const sales = parseFloat(item.total_stores);
      const increasedSalesPercent = parseFloat(item.increased_sales_percent);

      // Sum up sales for the same month
      aggregatedData[month] = (aggregatedData[month] || 0) + sales;
      aggregatedSalesData[month] =
        (aggregatedSalesData[month] || 0) + increasedSalesPercent;
    }
  });

  // Convert the aggregated data into an array of objects for the chart
  return Object.keys(aggregatedData).map((month) => ({
    date: month,
    value: aggregatedData[month]
  }));
};
