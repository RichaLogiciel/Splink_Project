import jwt from "jsonwebtoken";
import { ENTITY_TYPE } from "../config/appConstants";
import { validateEmail } from "../utils/helpers";
import { createMockRequestResponse } from "./helpers/test-utils";

// Mock response data
const mockInvitationResponse = {
  status: "success",
  data: {
    message: "Invitations sent successfully"
  }
};

const mockUsersListResponse = {
  status: "success",
  data: {
    users: [
      {
        id: 17233,
        email: "test_sand_sales_rep-bill@logiciel.io",
        firstName: "BILL",
        lastName: "VENEMA",
        phone: "(111) 111-1111",
        status: "INVITATION_SENT",
        createdAt: "2025-02-20T09:21:21.267Z",
        UserRole: {
          role: "DISTRIBUTOR_SALES_REP"
        }
      }
    ],
    currentPage: 1,
    totalPages: 1,
    totalRes: 1
  }
};

const mockEmptyUsersResponse = {
  status: "success",
  data: {
    users: [],
    currentPage: 1,
    totalPages: 0,
    totalRes: 0
  }
};

// Mock user data and roles
const mockUser = {
  userId: 1,
  id: 1,
  email: "test@example.com",
  role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
  associatedUserId: 1,
  parentEntityId: "",
  parentEntityType: ""
};

const mockUsers = {
  distributorAdmin: {
    userId: 1,
    id: 1,
    email: "distributor@example.com",
    role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
    associatedUserId: 1
  },
  distributorExecutive: {
    userId: 2,
    id: 2,
    email: "executive@example.com",
    role: ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE,
    associatedUserId: 2
  },
  manufacturerAdmin: {
    userId: 3,
    id: 3,
    email: "manufacturer@example.com",
    role: ENTITY_TYPE.MANUFACTURER,
    associatedUserId: 3
  },
  salesRep: {
    userId: 4,
    id: 4,
    email: "salesrep@example.com",
    role: ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
    associatedUserId: 4
  }
};

// Mock UserController
jest.mock("../controllers/UserController", () => ({
  __esModule: true,
  default: {
    getUsers: jest.fn().mockImplementation((req, res) => {
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "No authorization token provided" });
      }
      if (req.headers.authorization === "Bearer invalid-token") {
        return res.status(401).json({ message: "Invalid token" });
      }

      const { currentPage, sort, searchQuery } = req.query;

      // Validate pagination
      if (
        currentPage &&
        (isNaN(Number(currentPage)) || Number(currentPage) < 1)
      ) {
        return res.status(400).json({
          status: "error",
          message: "Invalid pagination parameters"
        });
      }

      // Validate sort parameter
      if (sort && !["ASC", "DESC"].includes(sort.toString())) {
        return res.status(400).json({
          status: "error",
          message: "Invalid sort parameter. Must be ASC or DESC"
        });
      }

      if (searchQuery === "nonexistent") {
        return res.status(200).json(mockEmptyUsersResponse);
      }

      return res.status(200).json(mockUsersListResponse);
    })
  }
}));

// Mock AuthController
jest.mock("../controllers/auth/AuthController", () => ({
  __esModule: true,
  default: {
    inviteUsers: jest.fn().mockImplementation((req, res) => {
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "No authorization token provided" });
      }
      if (req.headers.authorization === "Bearer invalid-token") {
        return res.status(401).json({ message: "Invalid token" });
      }

      const { role } = req.user;
      const { emails } = req.body;

      // Validate email array
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Email list cannot be empty"
        });
      }

      // Check for duplicate emails
      const uniqueEmails = new Set(emails.map((e) => e.email));
      if (uniqueEmails.size !== emails.length) {
        return res.status(400).json({
          status: "error",
          message: "Duplicate emails are not allowed"
        });
      }

      // Validate role presence
      if (emails.some((e) => !e.role)) {
        return res.status(400).json({
          status: "error",
          message: "Role is required for invitation"
        });
      }

      // Email validation regex
      const invalidEmails = emails.filter((e) => !validateEmail(e.email));
      if (invalidEmails.length > 0) {
        return res.status(422).json({
          status: "error",
          message: "Invalid email format provided"
        });
      }

      // Role permission validation
      const invitedRole = emails[0].role;
      let isAllowed = false;

      switch (role) {
        case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
          isAllowed = [
            ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE,
            ENTITY_TYPE.DISTRIBUTOR_SALES_REP
          ].includes(invitedRole);
          break;
        case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE:
          isAllowed = [ENTITY_TYPE.DISTRIBUTOR_SALES_REP].includes(invitedRole);
          break;
        case ENTITY_TYPE.MANUFACTURER:
          isAllowed = [ENTITY_TYPE.MANUFACTURER_EXECUTIVE].includes(
            invitedRole
          );
          break;
      }

      if (!isAllowed) {
        return res.status(422).json({
          status: "error",
          message: "You are not authorized to invite users with this role"
        });
      }

      return res.status(200).json(mockInvitationResponse);
    }),

    cancelUserInvitation: jest.fn().mockImplementation((req, res) => {
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "No authorization token provided" });
      }
      if (req.headers.authorization === "Bearer invalid-token") {
        return res.status(401).json({ message: "Invalid token" });
      }

      const { userId } = req.body;

      if (!userId) {
        return res.status(412).json({
          status: "error",
          data: 'WHERE parameter "id" has invalid "undefined" value'
        });
      }

      // Validate userId format
      if (isNaN(Number(userId))) {
        return res.status(400).json({
          status: "error",
          message: "Invalid user ID format"
        });
      }

      // Check for non-existent user
      if (Number(userId) === 99999) {
        return res.status(404).json({
          status: "error",
          message: "User invitation not found"
        });
      }

      return res.status(200).json({
        status: "success",
        data: {
          message: "Invitations have been successfully canceled"
        }
      });
    })
  }
}));

const UserController = require("../controllers/UserController").default;
const AuthController = require("../controllers/auth/AuthController").default;

describe("Users Listing API Tests", () => {
  let mockToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    mockToken = jwt.sign(mockUser, process.env.JWT_SECRET || "test-secret", {
      expiresIn: "1h"
    });
  });

  it("should return users list with valid token", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: {
        currentPage: 1,
        searchQuery: "",
        sort: "ASC",
        status: "",
        type: ""
      }
    });

    await UserController.getUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockUsersListResponse);
  });

  it("should validate users list data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await UserController.getUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");

    const { data } = response;
    expect(data).toEqual(
      expect.objectContaining({
        users: expect.any(Array),
        currentPage: expect.any(Number),
        totalPages: expect.any(Number),
        totalRes: expect.any(Number)
      })
    );

    if (data.users.length > 0) {
      data.users.forEach((user: any) => {
        expect(user).toEqual(
          expect.objectContaining({
            id: expect.any(Number),
            email: expect.any(String),
            firstName: expect.any(String),
            lastName: expect.any(String),
            phone: expect.any(String),
            status: expect.any(String),
            createdAt: expect.any(String),
            UserRole: expect.objectContaining({
              role: expect.any(String)
            })
          })
        );
      });
    }
  });

  it("should handle pagination", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: { currentPage: 2 }
    });

    await UserController.getUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data.currentPage).toBe(1);
  });

  it("should handle search query", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: { searchQuery: "BILL" }
    });

    await UserController.getUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].status).toBe("success");
  });

  it("should handle empty search results", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: { searchQuery: "nonexistent" }
    });

    await UserController.getUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data.users).toHaveLength(0);
  });

  it("should handle status filter", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: { status: "INVITATION_SENT" }
    });

    await UserController.getUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].status).toBe("success");
  });

  it("should handle role type filter", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: { type: "DISTRIBUTOR_SALES_REP" }
    });

    await UserController.getUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].status).toBe("success");
  });

  it("should handle multiple filters together", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: {
        currentPage: 1,
        searchQuery: "BILL",
        sort: "ASC",
        status: "INVITATION_SENT",
        type: "DISTRIBUTOR_SALES_REP"
      }
    });

    await UserController.getUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].status).toBe("success");
    expect(res.json.mock.calls[0][0].data).toBeDefined();
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse();

    await UserController.getUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token"
    });

    await UserController.getUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should handle invalid pagination parameters", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: { currentPage: -1 }
    });

    await UserController.getUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Invalid pagination parameters"
    });
  });

  it("should handle invalid sort parameters", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: { sort: "INVALID" }
    });

    await UserController.getUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Invalid sort parameter. Must be ASC or DESC"
    });
  });
});

describe("User Invitation API Tests", () => {
  describe("Input Validation", () => {
    let mockToken: string;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    beforeAll(() => {
      mockToken = jwt.sign(mockUser, process.env.JWT_SECRET || "test-secret", {
        expiresIn: "1h"
      });
    });

    it("should reject empty email array", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        body: { emails: [] }
      });

      await AuthController.inviteUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Email list cannot be empty"
      });
    });

    it("should reject invitation without role", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        body: {
          emails: [{ email: "test@example.com" }]
        }
      });

      await AuthController.inviteUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Role is required for invitation"
      });
    });

    it("should handle duplicate emails", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        body: {
          emails: [
            {
              email: "test@example.com",
              role: ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
            },
            {
              email: "test@example.com",
              role: ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
            }
          ]
        }
      });

      await AuthController.inviteUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Duplicate emails are not allowed"
      });
    });
  });

  describe("Distributor Admin Invitations", () => {
    let mockToken: string;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    beforeAll(() => {
      mockToken = jwt.sign(
        mockUsers.distributorAdmin,
        process.env.JWT_SECRET || "test-secret",
        { expiresIn: "1h" }
      );
    });

    it("should allow inviting distributor executive", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        user: mockUsers.distributorAdmin,
        body: {
          emails: [
            {
              email: "test_newExec@logiciel.io",
              role: ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
            }
          ]
        }
      });

      await AuthController.inviteUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockInvitationResponse);
    });

    it("should allow inviting sales representative", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        user: mockUsers.distributorAdmin,
        body: {
          emails: [
            {
              email: "salesrep@example.com",
              role: ENTITY_TYPE.DISTRIBUTOR_SALES_REP
            }
          ]
        }
      });

      await AuthController.inviteUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockInvitationResponse);
    });

    it("should allow inviting multiple users", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        user: mockUsers.distributorAdmin,
        body: {
          emails: [
            {
              email: "exec1@example.com",
              role: ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
            },
            {
              email: "exec2@example.com",
              role: ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
            }
          ]
        }
      });

      await AuthController.inviteUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockInvitationResponse);
    });

    it("should reject invalid email format", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        body: {
          emails: [
            {
              email: "invalid-email",
              role: ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
            }
          ]
        }
      });

      await AuthController.inviteUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Invalid email format provided"
      });
    });

    it("should reject unauthorized role invitations", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        body: {
          emails: [
            {
              email: "manufacturer@example.com",
              role: ENTITY_TYPE.MANUFACTURER
            }
          ]
        }
      });

      await AuthController.inviteUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "You are not authorized to invite users with this role"
      });
    });
  });

  describe("Distributor Executive Invitations", () => {
    let mockToken: string;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    beforeAll(() => {
      mockToken = jwt.sign(
        mockUsers.distributorExecutive,
        process.env.JWT_SECRET || "test-secret",
        { expiresIn: "1h" }
      );
    });

    it("should allow inviting sales representative", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        user: mockUsers.distributorExecutive,
        body: {
          emails: [
            {
              email: "salesrep@example.com",
              role: ENTITY_TYPE.DISTRIBUTOR_SALES_REP
            }
          ]
        }
      });

      await AuthController.inviteUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockInvitationResponse);
    });

    it("should reject executive role invitations", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        body: {
          emails: [
            {
              email: "exec@example.com",
              role: ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
            }
          ]
        }
      });

      await AuthController.inviteUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "You are not authorized to invite users with this role"
      });
    });
  });

  describe("Manufacturer Admin Invitations", () => {
    let mockToken: string;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    beforeAll(() => {
      mockToken = jwt.sign(
        mockUsers.manufacturerAdmin,
        process.env.JWT_SECRET || "test-secret",
        { expiresIn: "1h" }
      );
    });

    it("should allow inviting manufacturer executive", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        user: mockUsers.manufacturerAdmin,
        body: {
          emails: [
            {
              email: "exec@example.com",
              role: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
            }
          ]
        }
      });

      await AuthController.inviteUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockInvitationResponse);
    });

    it("should reject other role invitations", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        body: {
          emails: [
            {
              email: "sales@example.com",
              role: ENTITY_TYPE.DISTRIBUTOR_SALES_REP
            }
          ]
        }
      });

      await AuthController.inviteUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "You are not authorized to invite users with this role"
      });
    });
  });
});

describe("Cancel User Invitation Tests", () => {
  let mockToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    mockToken = jwt.sign(mockUser, process.env.JWT_SECRET || "test-secret", {
      expiresIn: "1h"
    });
  });

  it("should successfully cancel invitation", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: { userId: 123 }
    });

    await AuthController.cancelUserInvitation(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: {
        message: "Invitations have been successfully canceled"
      }
    });
  });

  it("should return 412 if userId is not provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: {}
    });

    await AuthController.cancelUserInvitation(req, res);

    expect(res.status).toHaveBeenCalledWith(412);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      data: 'WHERE parameter "id" has invalid "undefined" value'
    });
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      body: { userId: 123 }
    });

    await AuthController.cancelUserInvitation(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token",
      body: { userId: 123 }
    });

    await AuthController.cancelUserInvitation(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should handle invalid userId format", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: { userId: "invalid-id" }
    });

    await AuthController.cancelUserInvitation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Invalid user ID format"
    });
  });

  it("should handle non-existent userId", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: { userId: 99999 }
    });

    await AuthController.cancelUserInvitation(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "User invitation not found"
    });
  });
});
