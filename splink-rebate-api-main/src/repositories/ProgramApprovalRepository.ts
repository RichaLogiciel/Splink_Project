import { Transaction } from "sequelize";
import ProgramApproval from "../models/ProgramApproval";

export class ProgramApprovalRepository {
  public async create(data: any, transaction?: Transaction) {
    return ProgramApproval.create(data, { transaction });
  }

  public async findByProgramId(programId: number) {
    return ProgramApproval.findAll({
      where: { program_id: programId }
    });
  }

  public async update(id: number, data: any, transaction?: Transaction) {
    const approval = await ProgramApproval.findByPk(id);
    if (!approval) {
      throw new Error("Program approval not found");
    }
    return approval.update(data, { transaction });
  }

  public async findByProgramAndApprover(
    programId: number,
    approverType: string,
    approverId: number
  ) {
    return ProgramApproval.findOne({
      where: {
        program_id: programId,
        approver_type: approverType,
        approver_id: approverId
      }
    });
  }
}

export default new ProgramApprovalRepository();
