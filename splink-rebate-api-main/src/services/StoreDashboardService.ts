import { ENTITY_TYPE, ProgramsComplianceStatus } from "../config/appConstants";
import Manufacturer from "../models/Manufacturer";
import Product from "../models/Product";
import Program from "../models/Program";
import UserRole from "../models/UserRole";
import ComplianceRepository from "../repositories/ComplianceRepository";
import ManufacturerRepository from "../repositories/ManufacturerRepository";
import ProgramRepository from "../repositories/ProgramRepository";
import StoreRepository from "../repositories/StoreRepository";
import UserRoleRepository from "../repositories/UserRoleRepository";
import {
  AdditionalInfo,
  DistributorProgram,
  ManufacturerProgramCard
} from "../types/StoreProgramResponseTypes";
import StoreService from "./StoreService";

interface Compliance {
  id: number;
  programId: number;
  entityId: number;
  entityType: string;
  isQualified: boolean;
  totalPurchaseVolume: number;
  totalCasePurchases: number;
  earnedRebate: number;
  complianceDate: Date;
  createdAt: Date;
  updatedAt: Date;
  rebateType?: string;
  rebatePercentage?: number;
  rebateAmount?: number;
  description?: string;
  tier?: number;
  programDetailId?: number;
  status?: string;
}

class StoreDashboardService {
  public async getStoreKeyMetrics(
    userId: number,
    loggedInUser?: UserRole,
    storeIds?: number[]
  ): Promise<any> {
    try {
      const associatedUserId = await this.getAssociatedUserId(userId);

      const authorizedManufacturers = loggedInUser
        ? await ManufacturerRepository.getAuthorizedManufacturers(
            loggedInUser.parentEntityId
          )
        : [];

      const currentStoreIds = storeIds?.length ? storeIds : [associatedUserId];

      let ineligibleStoreProgramIds: any[] = [];
      if (associatedUserId) {
        ineligibleStoreProgramIds =
          await ProgramRepository.getIneligibleProgramIds(associatedUserId);
      }

      // ******************* Get Unique Manufacturer Start *******************

      // Load unique Manufacturers `{ id, name }` from `programs`
      // ******************* Get Unique Manufacturer End *******************

      // Count of unique Manufacturers from `programs`
      const totalManufacturers = authorizedManufacturers.length;

      const manufacturerIds = authorizedManufacturers?.map((au) =>
        parseInt(au.manufacturerId)
      );

      const distributorIds = loggedInUser ? [loggedInUser.parentEntityId] : [];

      // get excluded program_detail_ids using related distributor ids
      const excludedProgramDetailIds =
        await ProgramRepository.getExcludedProgramDetailIds(distributorIds);

      const validProgramIds =
        await ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity({
          participantType: ENTITY_TYPE.STORE,
          creatorIds: manufacturerIds,
          creatorType: ENTITY_TYPE.MANUFACTURER,
          secondaryCreatorIds: distributorIds,
          secondaryCreatorType: ENTITY_TYPE.DISTRIBUTOR,
          visibilityEntitieIds: currentStoreIds,
          distributorId: distributorIds
        });

      // get programs using manufacturer and excluded program_detail_ids
      let programs = await ProgramRepository.getProgramsByParticipantType({
        participantType: ENTITY_TYPE.STORE,
        authorizedManufacturerIds: manufacturerIds,
        excludedProgramDetailIds,
        programIds: validProgramIds
      });

      programs = programs?.filter(
        (pro: any) => !ineligibleStoreProgramIds.includes(pro.id)
      );

      // Get Program Compliances as per Associated User ID
      const allCompliances = await this.getCompliances(
        currentStoreIds,
        programs?.map((p) => p.id)
      );

      // Calculate Total Savings (earnedRebate) of Associated User
      const totalSavings = this.calculateTotalSavings(allCompliances);

      // get the manufacturer ids for only which have the any pprogram enabled
      const enabledManufacturerIds = programs.map(
        (pro) => pro?.Manufacturer?.id ?? pro?.Manufacturer?.get("id") ?? 0
      );

      const totalManufacturerPrograms =
        authorizedManufacturers?.filter((m: any) =>
          enabledManufacturerIds.includes(m.manufacturerId)
        )?.length * (storeIds?.length ?? 1);

      // get all store programs from authrised manufacturers
      const storePrograms = await StoreRepository.getManufacturerProgramsById(
        enabledManufacturerIds,
        ENTITY_TYPE.STORE,
        undefined,
        excludedProgramDetailIds,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined // isInternalInitiative - not available in dashboard context
      );

      let qualifiedManufacturers = 0;

      currentStoreIds.map((storeId: number) => {
        qualifiedManufacturers += authorizedManufacturers
          .filter((m: any) => enabledManufacturerIds.includes(m.manufacturerId))
          .reduce((count, au) => {
            const manufacturerId = au.manufacturerId;

            // Filter all programs for this manufacturer
            const manufacturerPrograms = storePrograms.filter(
              (p) => p.manufacturer_id === manufacturerId
            );

            // Check if all programs for this manufacturer are qualified in compliance
            const isAllQualified = manufacturerPrograms?.length
              ? manufacturerPrograms.every((prog) =>
                  allCompliances.some(
                    (com: any) =>
                      com.programDetailId === prog.program_detail_id &&
                      com.isQualified &&
                      com.entityId === storeId
                  )
                )
              : false;

            // If all programs are qualified, increment the count
            return isAllQualified ? count + 1 : count;
          }, 0);
      });

      return this.createResponse(
        totalSavings,
        "",
        "",
        totalManufacturers,
        totalManufacturerPrograms,
        qualifiedManufacturers
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to get store programs");
    }
  }

  private async getAssociatedUserId(userId: number): Promise<number> {
    return (await UserRoleRepository.getAssociatedEntityId(userId)) ?? 0;
  }

  private getUniqueProgramIds(allCompliances: Compliance[]): number[] {
    return [...new Set(allCompliances.map((c: Compliance) => c.programId))];
  }

  private calculateTotalSavings(allCompliances: Compliance[]): number {
    return this.calculateTotal(allCompliances, "earnedRebate");
  }
  private calculateTotalPurchaseVolume(allCompliances: Compliance[]): number {
    return this.calculateTotal(allCompliances, "totalPurchaseVolume");
  }

  private async getProgramsByIds(programIds: number[]): Promise<any[]> {
    return await ProgramRepository.getDistributorPrograms(programIds);
  }

  private getLatestCompliance(allCompliances: Compliance[]): Compliance {
    return allCompliances.reduce(
      (latest: Compliance, compliance: Compliance) => {
        return new Date(compliance.complianceDate) >
          new Date(latest.complianceDate)
          ? compliance
          : latest;
      }
    );
  }

  private getLatestProgram(allPrograms: Program[]): Program {
    return allPrograms.reduce((latest: Program, program: Program) => {
      return new Date(program.endDate) > new Date(latest.endDate)
        ? program
        : latest;
    });
  }

  private formatComplianceDate(date: string | number | Date): string {
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const day = new Date(date).getDate();

    return formattedDate.replace(
      day.toString(),
      `${day}${this.getOrdinalSuffix(day)}`
    );
  }

  private getFirstDateOfNextMonth(date: string | number | Date): string {
    const nextMonthFirstDate = new Date(
      new Date(date).getFullYear(),
      new Date(date).getMonth() + 1,
      1
    );

    return nextMonthFirstDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  private async calculateTierAchieved(
    associatedUserId: number,
    uniqueProgramIds: number[]
  ): Promise<number> {
    const programParticipants =
      await ProgramRepository.getProgramsByProgramIdEntityIdAndType(
        uniqueProgramIds,
        [associatedUserId],
        ENTITY_TYPE.STORE
      );

    return programParticipants.length;
  }

  private createResponse(
    totalSavings: number,
    formattedLatestDate: string,
    formattedNextMonthFirstDate: string,
    totalManufacturerPrograms: number,
    totalUniquePrograms: number,
    tierAchieved: number
  ) {
    return {
      TotalSavingsCardData: {
        yoyValue: 0,
        info: `Total amount through ${formattedLatestDate}`,
        value: totalSavings,
        footerInfo: `Next Withdrawal Date ${formattedNextMonthFirstDate}`,
        link: {
          label: "Withdraw Funds",
          href: "/"
        }
      },
      TotalManufacturer: {
        value: totalManufacturerPrograms
      },
      TotalTier: {
        value: totalUniquePrograms
      },
      TierAchievedData: {
        value: tierAchieved
      }
    };
  }

  public async getStorePrograms(
    userId: number
  ): Promise<ManufacturerProgramCard[]> {
    try {
      const associatedUserId =
        (await UserRoleRepository.getAssociatedEntityId(userId)) ?? 0;

      const allCompliances = await this.getCompliances([associatedUserId]);
      const uniqueProgramIds = [
        ...new Set(allCompliances.map((c: Compliance) => c.programId))
      ];

      const programs = await ProgramRepository.getDistributorPrograms(
        uniqueProgramIds as number[]
      );

      const manufacturerPrograms = await this.groupProgramByManufacturer(
        programs,
        allCompliances,
        associatedUserId
      );

      return manufacturerPrograms;
    } catch {
      throw new Error("Failed to get store programs");
    }
  }

  /**
   * Retrieves compliance records for a given entity IDs and type.
   *
   * @param {number[]} associatedUserIds The ID of the associated user role.
   * @param {number[]} [programIds] Optional parameter. The list of program IDs to filter the results.
   * @returns {Promise<any>} A promise that resolves to an array of compliance records.
   */
  public async getCompliances(
    associatedUserIds: number[],
    programIds?: number[],
    excludeUnenrolledStores?: boolean
  ): Promise<any> {
    // Fetch and return compliance records using the entity IDs and types
    const compliances =
      ComplianceRepository.findComplianceByEntityIdAndEntityType({
        entityId: associatedUserIds,
        entityType: [ENTITY_TYPE.STORE],
        programIds,
        includeOnlyParticipatedProgramCompliances: excludeUnenrolledStores
      });

    return compliances;
  }

  private async groupProgramByManufacturer(
    programs: Program[],
    compliances: Compliance[],
    associatedUserId: number
  ): Promise<ManufacturerProgramCard[]> {
    const programListingCards: ManufacturerProgramCard[] = [];

    const uniqueManufacturerIds = Array.from(
      new Set(
        programs
          .map((program) => program.Manufacturer?.id)
          .filter((id): id is number => id !== undefined) // Ensure to filter out undefined IDs
      )
    );

    uniqueManufacturerIds.forEach(async (id) => {
      const manufacturer = await Manufacturer.findByPk(id);

      const obj = await StoreService.getStoreProgramsDetailsByManufacturerId({
        storeId: associatedUserId,
        manufacturerId: id,
        isEnrolledPrograms: true
      });

      const programListingCard = this.createEmptyProgramListingCard();
      const programforman = programs.filter((program) => {
        if (program.Manufacturer?.id === id) {
          return program;
        }
      });

      let totalsavings = 0;
      let totalpurchaseVolume = 0;

      programforman.forEach((program) => {
        const matchingCompliances = compliances.filter(
          (c) => c.programId === program.id
        );

        const { totalPurchaseVolume, totalSavings } =
          this.calculateComplianceAggregates(matchingCompliances);

        totalsavings += totalSavings;
        totalpurchaseVolume += totalPurchaseVolume;
      });

      const distributorProgramArray: DistributorProgram[] = [];

      obj.tierDetails.forEach((tierDetail: any) => {
        const distributorProgram: DistributorProgram =
          this.createEmptyDistributorProgram();

        distributorProgram.additionalInfo.info = tierDetail.title ?? "";
        distributorProgram.additionalInfo.title = tierDetail.title ?? "";
        distributorProgramArray.push(distributorProgram);
      });

      // programListingCard.manufacturer = id
      programListingCard.id = String(manufacturer?.id ?? 0);
      programListingCard.storeId = associatedUserId;
      programListingCard.manufacturer.name = manufacturer?.name ?? "";
      programListingCard.storeId = associatedUserId;
      programListingCard.salesData.purchaseVolume.amount = totalpurchaseVolume;
      programListingCard.salesData.totalSavings.amount = totalsavings;
      programListingCard.programs = distributorProgramArray;
      programListingCards.push(programListingCard);
    });

    return programListingCards;
  }

  // Helper function to add or update tier-based distributor programs
  private addOrUpdateDistributorProgram(
    distributorProgramArray: DistributorProgram[],
    program: Program,
    compliance: Compliance
  ) {
    const index = this.findDistributorProgramForTierIndex(
      compliance,
      distributorProgramArray
    );

    if (index !== -1) {
      distributorProgramArray[index].additionalInfo.totalSavings.amount +=
        compliance.rebateAmount ?? 0;
    } else {
      const newProgram = this.buildDistributorProgram(program, compliance);
      distributorProgramArray.push(newProgram);
    }
  }

  // Helper function to add a non-tier distributor program
  private addSingleDistributorProgram(
    distributorProgramArray: DistributorProgram[],
    program: Program,
    compliance: Compliance
  ) {
    const distributorProgram = this.buildDistributorProgram(
      program,
      compliance
    );

    distributorProgramArray.push(distributorProgram);
  }

  // Helper function to construct a distributor program
  private buildDistributorProgram(
    program: Program,
    compliance: Compliance
  ): DistributorProgram {
    const distributorProgram = this.createEmptyDistributorProgram();
    distributorProgram.programId = program.id;
    distributorProgram.type = program.programType;
    distributorProgram.paymentTerms = program.paymentTerm;
    distributorProgram.complianceStatus = compliance.isQualified;
    // distributorProgram.programdetailId = compliance.programDetailId;
    distributorProgram.complianceid = compliance.id;
    distributorProgram.additionalInfo.title = `${program.programType} ${compliance.tier ?? ""}`;

    if (compliance.rebateType?.toLowerCase() === "percentage") {
      distributorProgram.rebateType = "percentage";
      distributorProgram.rebate = String(compliance.rebatePercentage ?? 0);
    } else {
      distributorProgram.rebateType = "amount";
      distributorProgram.rebate = String(compliance.rebateAmount ?? 0);
    }

    distributorProgram.overview = compliance.description ?? "";
    distributorProgram.additionalInfo.totalSavings.amount =
      compliance.rebateAmount ?? 0;

    return distributorProgram;
  }

  private findManufacturerIndex = (
    name: string,
    programListingCards: ManufacturerProgramCard[]
  ): number => {
    return programListingCards.findIndex(
      (card) => card.manufacturer.name === name
    );
  };

  private findDistributorProgramForTierIndex = (
    compliance: Compliance,
    distributorProgram: DistributorProgram[]
  ): number => {
    return distributorProgram.findIndex(
      (card) =>
        card.programTier === compliance.tier &&
        card.programId === compliance.programId
    );
  };

  private calculateComplianceAggregates(compliances: Compliance[]) {
    return {
      totalPurchaseVolume: this.calculateTotal(
        compliances,
        "totalPurchaseVolume"
      ),
      totalSavings: this.calculateTotal(compliances, "earnedRebate")
    };
  }

  // Add this new method to your class
  private calculateAggregates(compliances: Compliance[]) {
    return {
      totalPurchaseVolume: this.calculateTotal(
        compliances,
        "totalPurchaseVolume"
      ),
      totalSavings: this.calculateTotal(compliances, "earnedRebate")
    };
  }
  private calculateTotal(
    compliances: Compliance[],
    key: keyof Compliance
  ): number {
    return compliances.reduce((total, compliance) => {
      // Convert string to number and handle null/undefined
      const value =
        compliance[key] &&
        ((key == "earnedRebate" &&
          compliance.status == ProgramsComplianceStatus.Active) ||
          key != "earnedRebate")
          ? parseFloat(compliance[key] as string)
          : 0;

      // Return sum with 2 decimal places
      return Number((total + value).toFixed(2));
    }, 0);
  }
  // Function to get the ordinal suffix for a date
  private getOrdinalSuffix(day: number) {
    if (day > 3 && day < 21) return "th";

    switch (day % 10) {
      case 1:
        return "st";

      case 2:
        return "nd";

      case 3:
        return "rd";

      default:
        return "th";
    }
  }

  private getUniqueManufacturers(programs: Program[]): any[] {
    const uniqueManufacturers = Array.from(
      programs
        .reduce((map, program) => {
          if (program.Manufacturer) {
            map.set(program.Manufacturer.id, program.Manufacturer);
          }
          return map;
        }, new Map<number, Manufacturer>())
        .values()
    );

    return uniqueManufacturers;
  }

  private createEmptyProgramListingCard(): ManufacturerProgramCard {
    return {
      id: "",
      storeId: 0,
      manufacturer: {
        avatar: "",
        name: ""
      },
      salesData: {
        purchaseVolume: { amount: 0, yoy: 0 },
        totalSavings: { amount: 0, yoy: 0 },
        totalOppSavings: { amount: 0 },
        totalSalesRepSpiff: { amount: 0 }
      },
      programs: []
    };
  }
  private createEmptyDistributorProgram(): DistributorProgram {
    return {
      programId: 0,
      programTier: 0,
      type: "",
      rebate: "",
      rebateType: "",
      overview: "",
      paymentTerms: "",
      complianceStatus: false,
      additionalInfo: {} as AdditionalInfo, // Assuming AdditionalInfo is another interface
      complianceid: 0,
      programdetailId: 0
    };
  }

  /**
   * Retrieves manufacturer details for a given manufacturer ID, associated user ID, and optionally program ID and program detail ID.
   *
   * This method fetches the manufacturer by ID and retrieves all products associated with the manufacturer.
   * It also calls the getCompliances method to fetch all compliances for the given program ID and program detail ID.
   * The method then calculates the total savings, total purchase volume, and completed programs based on the compliances.
   * Finally, it creates an EnrolledProgram object, populates it with the manufacturer details, and returns it.
   * @param {number} manufacturerId The ID of the manufacturer for whom to retrieve details.
   * @param {number} associatedUserId The ID of the user associated with the manufacturer.
   * @param {number} [programId] Optional ID of the program for which to filter compliances.
   * @param {number} [programDetailId] Optional ID of the program detail for which to filter compliances.
   * @returns {Promise<EnrolledProgram | null>} A promise that resolves to an EnrolledProgram object or null if there is an error.
   */
  async getManufacturerDetails(
    manufacturerId: number,
    associatedUserId: number,
    programId?: number,
    programDetailId?: number,
    forStore: number = 0,
    distributorId: number = 0,
    isManufacturerUser?: boolean,
    programTimeline?: string,
    type?: string,
    isChainPrograms?: boolean
  ): Promise<any | null> {
    try {
      const storeId = forStore != 0 ? forStore : associatedUserId;
      const manufacturer = await Manufacturer.findByPk(manufacturerId);
      if (!manufacturer) return null;

      const storesEarningOpportunities =
        await StoreRepository.getStoresEarningOpportunity(
          [storeId],
          distributorId,
          manufacturerId
        );

      const products = await Product.findAll({
        where: { manufacturer_id: manufacturerId }
      });

      let ineligibleStoreProgramIds: any[] = [];
      if (associatedUserId) {
        ineligibleStoreProgramIds =
          await ProgramRepository.getIneligibleProgramIds(storeId);
      }

      const validProgramIds =
        await ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity({
          participantType: ENTITY_TYPE.STORE,
          creatorIds: [manufacturerId],
          creatorType: ENTITY_TYPE.MANUFACTURER,
          secondaryCreatorIds: [distributorId],
          secondaryCreatorType: ENTITY_TYPE.DISTRIBUTOR,
          visibilityEntitieIds: [storeId],
          distributorId: [distributorId]
        });

      const manufacturerProgramIds = [];
      if (manufacturerId) {
        const manufacturerPrograms =
          await StoreRepository.getProgramsBymanufacturerIdAndEntityType(
            type === ENTITY_TYPE.CHAIN ? ENTITY_TYPE.CHAIN : ENTITY_TYPE.STORE, // Added Support for Chain Programs
            manufacturerId,
            undefined,
            programTimeline
          );
        for (const manfProgram of manufacturerPrograms) {
          manufacturerProgramIds.push(manfProgram.program_id);
        }
      }

      let programIds = programId
        ? [programId]
        : manufacturerId
          ? manufacturerProgramIds
          : undefined;

      if (programIds && programIds.length > 0) {
        programIds = Array.from(
          new Set(
            programIds.filter(
              (programId) =>
                !ineligibleStoreProgramIds.includes(programId) &&
                validProgramIds.includes(programId)
            )
          )
        );
      }

      const allCompliancesResult = await this.getCompliances(
        [storeId],
        programIds
      );

      const allCompliances = programDetailId
        ? allCompliancesResult?.filter(
            (com: any) => com.programDetailId === programDetailId
          )
        : allCompliancesResult;

      //const uniqueProgramIds = this.getUniqueProgramIds(allCompliances);
      const obj = await StoreService.getStoreProgramsDetailsByManufacturerId({
        storeId,
        manufacturerId,
        isEnrolledPrograms: null,
        includeProgramDetailInTier: true,
        isManufacturerUser,
        programTimeline,
        isChainPrograms: type === ENTITY_TYPE.CHAIN || isChainPrograms // Added Support for Chain Programs
      });

      const manufacturerobject: EnrolledProgram =
        this.createEmptyEnrolledProgram();

      manufacturerobject.manufacturer.id = manufacturer.id;
      manufacturerobject.manufacturer.name = manufacturer.name;
      manufacturerobject.manufacturer.storeId = storeId;
      manufacturerobject.manufacturer.avatar = manufacturer.logo;
      obj.additionalInfo.recommendedProducts.forEach((product: any) => {
        manufacturerobject.manufacturer.additionalInfo?.recommendedProducts?.push(
          { ...product }
        );
      });

      obj.additionalInfo.purchasedProducts.forEach((product: any) => {
        manufacturerobject.manufacturer.additionalInfo?.purchasedProducts?.push(
          { ...product }
        );
      });

      products.forEach((product: any) => {
        manufacturerobject.manufacturer.additionalInfo?.products?.push({
          name: product.name,
          size: product.size,
          image: "",
          extraInfo: "",
          wishlist: false
        });
      });

      obj.tierDetails.forEach((tierDetail: any) => {
        manufacturerobject.manufacturer.tierDetails?.push({
          ...tierDetail,
          description: "",
          totalPotentialSavings: 0,
          totalOppSavings: {
            amount:
              storesEarningOpportunities?.find(
                (er: any) => er.program_detail_id == tierDetail.programDetailId
              )?.rebate_opportunity ?? 0
          }
        });
      });
      manufacturerobject.allCompliances = allCompliances.map((c: any) => {
        return c.dataValues;
      });
      manufacturerobject.totalSavings.amount =
        this.calculateTotalSavings(allCompliances);
      manufacturerobject.purchaseVolume.amount =
        this.calculateTotalPurchaseVolume(allCompliances);
      let completedPrograms = 0;
      manufacturerobject.totalOppSavings = {
        amount: storesEarningOpportunities
          ?.filter((er: any) => er.highest_tier)
          ?.reduce(
            (acc: number, er: any) =>
              acc + parseFloat(er.rebate_opportunity ?? "0"),
            0
          )
      };
      allCompliances.forEach((compliance: Compliance) => {
        if (compliance.isQualified) {
          completedPrograms += 1;
        }
      });
      manufacturerobject.programCompliance.total = allCompliances.length;
      manufacturerobject.programCompliance.completed = completedPrograms;

      // check if store is enrolled in atleast one program of manufacturer (enrolled or participated means same thing)
      const isEnrolled =
        await StoreRepository.isParticipatedInManufacturerProgram(
          storeId,
          manufacturerId
        );
      manufacturerobject.isEnrolled = isEnrolled;

      return manufacturerobject;
    } catch (error: any) {
      console.log("DEBUG: getManufacturerDetails error => ", error);
    }

    return null;
  }

  createManufacturerDetails = (): ManufacturerDetails => ({
    manufacturer: {
      id: 0,
      avatar: "",
      name: "",
      additionalInfo: {} as AdditionalInfoM,
      tierDetails: []
    },
    programCompliance: {} as ProgramCompliance,
    purchaseVolume: {} as VolumeDetails,
    totalSavings: {} as VolumeDetails
  });

  createEmptyEnrolledProgram(): EnrolledProgram {
    return {
      manufacturer: {
        id: 0,
        storeId: 0,
        avatar: "",
        name: "",
        additionalInfo: {
          note: "",
          products: [],
          recommendedProducts: [],
          purchasedProducts: []
        },
        tierDetails: []
      },
      programCompliance: {
        total: 0,
        completed: 0
      },
      purchaseVolume: {
        amount: 0,
        yoy: 0
      },
      totalSavings: {
        amount: 0,
        yoy: 0
      }
    };
  }
}

export default new StoreDashboardService();

export interface EnrolledProgram {
  manufacturer: ManufacturerResponse;
  programCompliance: ProgramCompliance;
  purchaseVolume: PurchaseVolume;
  totalSavings: TotalSavings;
  totalOppSavings?: TotalOppSavings;
  isEnrolled?: boolean;
  allCompliances?: ProgramCompliance[];
}

interface AdditionalInfoM {
  note: string;
  products: Array<{
    name: string;
    image: string;
    extraInfo: string;
    wishlist: boolean;
  }>;
}

interface TierDetail {
  title: string;
  description: string;
  SKU: {
    completed: number;
    total: number;
    chartColor: string;
  };
  totalPotenialSavings: number;
}

interface VolumeDetails {
  amount: number;
  yoy: number;
}

interface ManufacturerDetails {
  manufacturer: {
    storeId?: number;
    id: number;
    avatar: string;
    name: string;
    additionalInfo: AdditionalInfoM;
    tierDetails: TierDetail[];
  };
  programCompliance: ProgramCompliance;
  purchaseVolume: VolumeDetails;
  totalSavings: VolumeDetails;
}

export interface ManufacturerResponse {
  id: number;
  storeId?: number;
  avatar: string;
  name: string;
  additionalInfo?: {
    note: string;
    products: ManufacturerProduct[];
    recommendedProducts?: ManufacturerProduct[];
    purchasedProducts?: ManufacturerProduct[];
  };
  tierDetails?: ManufacturerTierDetail[];
}

export interface PurchaseVolume {
  amount: number;
  yoy?: number; // Optional, since some data might not include YoY
}

export interface TotalSavings {
  amount: number;
  yoy?: number;
}

export interface TotalOppSavings {
  amount: number;
}

export interface ProgramCompliance {
  total: number;
  completed: number;
}

export interface ManufacturerProduct {
  image: string;
  name: string;
  size?: string;
  extraInfo: string;
  wishlist?: boolean;
}

export interface ManufacturerTierDetail {
  tierName: string;
  minQuantity: number;
  maxQuantity: number;
  rebate: number;
}
