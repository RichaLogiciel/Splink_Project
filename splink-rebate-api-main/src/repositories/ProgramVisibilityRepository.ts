import { Transaction } from "sequelize";
import ProgramVisibility from "../models/ProgramVisibility";

export class ProgramVisibilityRepository {
  public async create(data: any, transaction?: Transaction) {
    return ProgramVisibility.create(data, { transaction });
  }

  public async findByProgramId(programId: number) {
    return ProgramVisibility.findAll({
      where: { program_id: programId }
    });
  }

  public async findByEntityId(entityType: string, entityId: number) {
    return ProgramVisibility.findAll({
      where: {
        entity_type: entityType,
        entity_id: entityId
      }
    });
  }

  public async delete(
    programId: number,
    entityType: string,
    entityId: number,
    transaction?: Transaction
  ) {
    return ProgramVisibility.destroy({
      where: {
        program_id: programId,
        entity_type: entityType,
        entity_id: entityId
      },
      transaction
    });
  }
}

export default new ProgramVisibilityRepository();
