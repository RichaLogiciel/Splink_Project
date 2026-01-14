import { Transaction } from "sequelize";
import { ProgramDetail } from "../models/ProgramDetail";

export class ProgramDetailRepository {
  public async create(data: any, transaction?: Transaction) {
    return ProgramDetail.create(data, { transaction });
  }

  public async findByProgramId(programId: number) {
    return ProgramDetail.findAll({
      where: { program_id: programId }
    });
  }

  public async update(id: number, data: any, transaction?: Transaction) {
    const detail = await ProgramDetail.findByPk(id);
    if (!detail) {
      throw new Error("Program detail not found");
    }
    return detail.update(data, { transaction });
  }
}

export default new ProgramDetailRepository();
