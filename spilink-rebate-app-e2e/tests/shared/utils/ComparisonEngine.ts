interface Program {
  manufacturer_id: number | null;
  manufacturer_name: string;
  sales_volume: number;
  earnings: number;
}

interface Snapshot {
  snapshot_date: string;
  week_ending: string;
  distributor: string;
  programs: Program[];
}

interface ComparisonResult {
  manufacturer_id: number | null;
  manufacturer_name: string;
  sales_volume: {
    current: number;
    previous: number;
    change: number;
    percentChange: number;
  };
  earnings: {
    current: number;
    previous: number;
    change: number;
    percentChange: number;
  };
  status: 'new' | 'removed' | 'changed' | 'unchanged';
}

interface ComparisonReport {
  distributor: string;
  currentDate: string;
  previousDate: string;
  results: ComparisonResult[];
  summary: {
    totalManufacturers: number;
    newManufacturers: number;
    removedManufacturers: number;
    manufacturersWithChanges: number;
  };
}

export class ComparisonEngine {
  /**
   * Finds a program in the previous snapshot by manufacturer_id or name
   */
  private findPreviousProgram(
    currentProgram: Program,
    previousPrograms: Program[]
  ): Program | null {
    // First try to match by manufacturer_id
    if (currentProgram.manufacturer_id !== null) {
      const match = previousPrograms.find(
        (p) => p.manufacturer_id === currentProgram.manufacturer_id
      );
      if (match) return match;
    }

    // Fallback to matching by name
    const match = previousPrograms.find(
      (p) => p.manufacturer_name === currentProgram.manufacturer_name
    );
    return match || null;
  }

  /**
   * Calculates percentage change
   */
  private calculatePercentChange(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  }

  /**
   * Compares current snapshot with previous snapshot
   */
  compare(
    currentSnapshot: Snapshot,
    previousSnapshot: Snapshot
  ): ComparisonReport {
    const results: ComparisonResult[] = [];
    const previousProgramsMap = new Map<string | number, Program>();

    // Create a map of previous programs for quick lookup
    previousSnapshot.programs.forEach((program) => {
      const key =
        program.manufacturer_id !== null
          ? program.manufacturer_id
          : program.manufacturer_name;
      previousProgramsMap.set(key, program);
    });

    // Compare current programs with previous
    currentSnapshot.programs.forEach((currentProgram) => {
      const previousProgram = this.findPreviousProgram(
        currentProgram,
        previousSnapshot.programs
      );

      if (!previousProgram) {
        // New manufacturer
        results.push({
          manufacturer_id: currentProgram.manufacturer_id,
          manufacturer_name: currentProgram.manufacturer_name,
          sales_volume: {
            current: currentProgram.sales_volume,
            previous: 0,
            change: currentProgram.sales_volume,
            percentChange: 100,
          },
          earnings: {
            current: currentProgram.earnings,
            previous: 0,
            change: currentProgram.earnings,
            percentChange: 100,
          },
          status: 'new',
        });
      } else {
        // Existing manufacturer - compare values
        const salesVolumeChange =
          currentProgram.sales_volume - previousProgram.sales_volume;
        const earningsChange =
          currentProgram.earnings - previousProgram.earnings;
        const salesVolumePercentChange = this.calculatePercentChange(
          currentProgram.sales_volume,
          previousProgram.sales_volume
        );
        const earningsPercentChange = this.calculatePercentChange(
          currentProgram.earnings,
          previousProgram.earnings
        );

        const hasChanges = salesVolumeChange !== 0 || earningsChange !== 0;

        results.push({
          manufacturer_id: currentProgram.manufacturer_id,
          manufacturer_name: currentProgram.manufacturer_name,
          sales_volume: {
            current: currentProgram.sales_volume,
            previous: previousProgram.sales_volume,
            change: salesVolumeChange,
            percentChange: salesVolumePercentChange,
          },
          earnings: {
            current: currentProgram.earnings,
            previous: previousProgram.earnings,
            change: earningsChange,
            percentChange: earningsPercentChange,
          },
          status: hasChanges ? 'changed' : 'unchanged',
        });
      }
    });

    // Find removed manufacturers (in previous but not in current)
    previousSnapshot.programs.forEach((previousProgram) => {
      const existsInCurrent = currentSnapshot.programs.some(
        (currentProgram) => {
          if (
            previousProgram.manufacturer_id !== null &&
            currentProgram.manufacturer_id === previousProgram.manufacturer_id
          ) {
            return true;
          }
          return (
            currentProgram.manufacturer_name ===
            previousProgram.manufacturer_name
          );
        }
      );

      if (!existsInCurrent) {
        results.push({
          manufacturer_id: previousProgram.manufacturer_id,
          manufacturer_name: previousProgram.manufacturer_name,
          sales_volume: {
            current: 0,
            previous: previousProgram.sales_volume,
            change: -previousProgram.sales_volume,
            percentChange: -100,
          },
          earnings: {
            current: 0,
            previous: previousProgram.earnings,
            change: -previousProgram.earnings,
            percentChange: -100,
          },
          status: 'removed',
        });
      }
    });

    // Calculate summary
    const summary = {
      totalManufacturers: currentSnapshot.programs.length,
      newManufacturers: results.filter((r) => r.status === 'new').length,
      removedManufacturers: results.filter((r) => r.status === 'removed')
        .length,
      manufacturersWithChanges: results.filter((r) => r.status === 'changed')
        .length,
    };

    return {
      distributor: currentSnapshot.distributor,
      currentDate: currentSnapshot.snapshot_date,
      previousDate: previousSnapshot.snapshot_date,
      results,
      summary,
    };
  }

  /**
   * Logs comparison report to console
   */
  logComparisonReport(report: ComparisonReport): void {
    console.log('\n========================================');
    console.log('WEEKLY SNAPSHOT COMPARISON REPORT');
    console.log('========================================');
    console.log(`Distributor: ${report.distributor}`);
    console.log(`Current Date: ${report.currentDate}`);
    console.log(`Previous Date: ${report.previousDate}`);
    console.log('\n--- Summary ---');
    console.log(`Total Manufacturers: ${report.summary.totalManufacturers}`);
    console.log(`New Manufacturers: ${report.summary.newManufacturers}`);
    console.log(
      `Removed Manufacturers: ${report.summary.removedManufacturers}`
    );
    console.log(
      `Manufacturers with Changes: ${report.summary.manufacturersWithChanges}`
    );

    console.log('\n--- Detailed Changes ---');
    report.results.forEach((result) => {
      if (result.status === 'new') {
        console.log(
          `\n✅ NEW: ${result.manufacturer_name} (ID: ${result.manufacturer_id})`
        );
        console.log(
          `   Sales Volume: $${result.sales_volume.current.toLocaleString()}`
        );
        console.log(
          `   Earnings: $${result.earnings.current.toLocaleString()}`
        );
      } else if (result.status === 'removed') {
        console.log(
          `\n❌ REMOVED: ${result.manufacturer_name} (ID: ${result.manufacturer_id})`
        );
        console.log(
          `   Previous Sales Volume: $${result.sales_volume.previous.toLocaleString()}`
        );
        console.log(
          `   Previous Earnings: $${result.earnings.previous.toLocaleString()}`
        );
      } else if (result.status === 'changed') {
        console.log(
          `\n📊 CHANGED: ${result.manufacturer_name} (ID: ${result.manufacturer_id})`
        );

        // Sales Volume changes
        const salesVolumeChange = result.sales_volume.change;
        const salesVolumePercent = result.sales_volume.percentChange;
        const salesVolumeIcon = salesVolumeChange > 0 ? '📈' : '📉';
        console.log(
          `   Sales Volume: ${salesVolumeIcon} $${result.sales_volume.current.toLocaleString()} (was $${result.sales_volume.previous.toLocaleString()})`
        );
        console.log(
          `   Sales Volume Change: ${
            salesVolumeChange > 0 ? '+' : ''
          }${salesVolumeChange.toLocaleString()} (${
            salesVolumePercent > 0 ? '+' : ''
          }${salesVolumePercent.toFixed(2)}%)`
        );

        // Earnings changes
        const earningsChange = result.earnings.change;
        const earningsPercent = result.earnings.percentChange;
        const earningsIcon = earningsChange > 0 ? '📈' : '📉';
        console.log(
          `   Earnings: ${earningsIcon} $${result.earnings.current.toLocaleString()} (was $${result.earnings.previous.toLocaleString()})`
        );
        console.log(
          `   Earnings Change: ${
            earningsChange > 0 ? '+' : ''
          }${earningsChange.toLocaleString()} (${
            earningsPercent > 0 ? '+' : ''
          }${earningsPercent.toFixed(2)}%)`
        );
      }
    });

    console.log('\n========================================\n');
  }

  /**
   * Extracts error flags for decreases (sales volume or earnings decreased)
   * Returns array of error flags that should fail the test
   */
  extractDecreaseErrors(report: ComparisonReport): Array<{
    failed: boolean;
    message: string;
  }> {
    const errorFlag: Array<{ failed: boolean; message: string }> = [];

    report.results.forEach((result) => {
      // Check for sales volume decrease
      if (result.sales_volume.change < 0) {
        errorFlag.push({
          failed: true,
          message: `[${report.distributor}] ${result.manufacturer_name} (ID: ${
            result.manufacturer_id
          }): Sales Volume decreased by ${Math.abs(
            result.sales_volume.percentChange
          ).toFixed(
            2
          )}%\nCurrent: $${result.sales_volume.current.toLocaleString()}, Previous: $${result.sales_volume.previous.toLocaleString()}\n\n`,
        });
      }

      // Check for earnings decrease
      if (result.earnings.change < 0) {
        errorFlag.push({
          failed: true,
          message: `[${report.distributor}] ${result.manufacturer_name} (ID: ${
            result.manufacturer_id
          }): Earnings decreased by ${Math.abs(
            result.earnings.percentChange
          ).toFixed(
            2
          )}%\nCurrent: $${result.earnings.current.toLocaleString()}, Previous: $${result.earnings.previous.toLocaleString()}\n\n`,
        });
      }
    });

    return errorFlag;
  }
}
