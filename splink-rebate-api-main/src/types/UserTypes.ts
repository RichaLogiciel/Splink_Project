export interface UserType {
  id: number;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  city: string;
  state: string;
  phone: string;
  secondaryPhone: string;
  isActive: boolean;
  status: string;
  lastLogin?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  logo?: string;
  title?: string;
  distributorName?: string;
  storeName?: string;
}

export interface getUserByIdApiRes {
  status: number;
  data: UserType | string;
}

export interface updateProfileDetailsReqBody {
  userID: number;
  firstName?: string;
  lastName?: string;
  phone?: string;
  secondaryPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  title?: string;
  distributorName?: string;
  manufacturerName?: string;
  storeName?: string;
  logo?: string;
}

export interface updateProfileDetailsApiRes {
  status: number;
  data: UserType | string;
}

export interface LoggedInUser {
  userId: number;
  id: number;
  email: string;
  role: string;
  associatedUserId: number;
  parentEntityId: number;
  parentEntityType: string;
  iat: number;
  exp: number;
}
