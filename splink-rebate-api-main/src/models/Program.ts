import { CreationOptional, DataTypes, Model, Op } from "sequelize";
import { PROGRAM_TIMELINE } from "../config/appConstants";
import sequelize from "../db";
import Manufacturer from "./Manufacturer";
import ProgramDetail from "./ProgramDetail";
import ProgramParticipant from "./ProgramParticipant";
import ProgramVisibility from "./ProgramVisibility";

class Program extends Model {
  // Required Fields
  declare id: number;
  declare manufacturerId: number;
  declare name: string;
  declare externalProgramId: string | null;
  declare participantType: string;
  declare programHeader: string;
  declare programType: string;
  declare paymentTerm: string;
  declare startDate: Date;
  declare endDate: Date;
  declare approvalStatus: string;
  declare targetAudience: string;
  declare visibilityScope: string;
  declare creatorType: string;
  declare creatorId: number;
  declare description: string | null;
  declare minPurchaseAmount: number | null;
  declare rebatePercentage: number | null;
  declare internalInitiative: boolean | null;
  declare dependencyProgramId: number | null;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  // Associations (Optional)
  declare Manufacturer?: Manufacturer;
  declare ProgramDetails?: ProgramDetail[];
  declare ProgramVisibility?: ProgramVisibility[];
  declare ProgramParticipants?: ProgramParticipant[];
  declare overview?: string;

  static getProgramTimelineFilter(programTimeline?: string) {
    let programWhere = {};
    const nowDate = new Date();
    const today = new Date(
      nowDate.getFullYear(),
      nowDate.getMonth(),
      nowDate.getDate()
    ); // ✅ Date only

    switch (programTimeline?.toLowerCase()) {
      case PROGRAM_TIMELINE.UPCOMING.toLowerCase(): {
        // Calculate 30 days from today
        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        programWhere = {
          startDate: { [Op.gte]: today, [Op.lte]: thirtyDaysFromNow }
        };
        break;
      }
      case PROGRAM_TIMELINE.HISTORICAL.toLowerCase(): {
        programWhere = {
          endDate: { [Op.lt]: today }
        };
        break;
      }
      case PROGRAM_TIMELINE.CURRENT.toLowerCase(): {
        programWhere = {
          endDate: { [Op.gte]: today },
          startDate: { [Op.lte]: today }
        };
        break;
      }
      default: {
        programWhere = {};
        break;
      }
    }

    return programWhere;
  }
}

Program.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    manufacturerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "manufacturers",
        key: "id"
      },
      field: "manufacturer_id"
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    externalProgramId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "external_program_id"
    },
    participantType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "participant_type"
    },
    programHeader: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "program_header"
    },
    programType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "program_type"
    },
    paymentTerm: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "payment_term"
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "start_date"
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "end_date"
    },
    approvalStatus: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "DRAFT",
      field: "approval_status"
    },
    targetAudience: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "BOTH",
      field: "target_audience"
    },
    visibilityScope: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "ALL_DISTRIBUTORS",
      field: "visibility_scope"
    },
    creatorType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "MANUFACTURER",
      field: "creator_type"
    },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: "creator_id"
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "description"
    },
    minPurchaseAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "min_purchase_amount"
    },
    rebatePercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: "rebate_percentage"
    },
    internalInitiative: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: "internal_initiative"
    },
    dependencyProgramId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      field: "dependency_program_id",
      comment: "Reference to another program that this program depends on"
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at"
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at"
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at"
    }
  },
  {
    sequelize,
    tableName: "programs",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    defaultScope: {
      where: {
        // end_date: {
        //   [Op.gte]: new Date(new Date().getFullYear(), 0, 1),
        //   [Op.lte]: new Date(new Date().getFullYear(), 11, 31, 23, 59, 59)
        // }
      }
    },
    scopes: {
      allData: {
        where: {} // This will remove the default filter
      }
    }
  }
);

export default Program;
