import { Model } from "sequelize";

// Using <any, any> for Model generics simplifies the mock definition
class MockProgram extends Model<any, any> {
  static create = jest.fn();
  static findByPk = jest.fn();
  static findAll = jest.fn();
  static findOne = jest.fn();
  static count = jest.fn();
  static destroy = jest.fn();
  static update = jest.fn();
  // Cast the return of scope to 'any' to resolve complex TypeScript type checking issues
  static scope = jest.fn(() => MockProgram as any);
  static sum = jest.fn();

  static hasMany = jest.fn();
  static belongsTo = jest.fn();
  static belongsToMany = jest.fn();
  static associate = jest.fn();

  // Instance methods like 'update' are usually mocked on the specific instance
  // returned by findByPk, etc., in your tests, not on the prototype here.
}

Object.defineProperty(MockProgram, "name", {
  value: "Program",
  configurable: true
});

export default MockProgram;
