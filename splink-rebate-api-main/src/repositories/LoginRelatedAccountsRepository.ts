import { ApiError } from "../lib/errors/APIError";
import LoginRelatedAccount from "../models/LoginRelatedAccount";

class LoginRelatedAccountsRepository {
  async getAllRelatedUserAccounts(userId: number): Promise<number[]> {
    try {
      const relatedIds = await LoginRelatedAccount.findAll({
        where: { user_id: userId },
        attributes: ["relatedUserId"],
        raw: true
      });

      return relatedIds.map(
        (el: { relatedUserId: number }) => el.relatedUserId
      );
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(` ${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }
}

export default new LoginRelatedAccountsRepository();
