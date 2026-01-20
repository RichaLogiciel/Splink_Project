export interface UserType {
  id: number;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  name: string;
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
  zip?: string;
  address?: string;
  title?: string;
  distributorName?: string;
  manufacturerName?: string;
  logo?: string;
  storeName?: string;
  chainName?: string;
}

export interface getUserByIdApiRes {
  status: number;
  data: UserType | string;
}

export interface EditProfilePropType {
  userInfo: UserType;
}

export interface AccountPageType {}

export interface EditProfileType {}
