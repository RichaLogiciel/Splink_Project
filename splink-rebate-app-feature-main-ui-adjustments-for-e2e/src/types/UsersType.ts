export interface UserCookie {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  associatedUserId: number;
  parentEntityId: number | null;
  parentEntityType: string | null;
  role: string;
  name?: string;
  logo?: string;
  distributorLogo?: string;
  distributorName?: string;
  orderingFeatureEnabled?: boolean | null;
  primaryWarehouseId?: number | null;
}

interface AssociatedNameDetails {
  name: string | null;
  organizationName?: string | null;
}
interface AssociatedStoreNameDetails {
  store_name: string | null;
  externalStoreId: string | null;
}

export interface UserRole {
  role: string;
  associated_entity_type?: string;
  AssociatedManufacturer?: AssociatedNameDetails | null;
  AssociatedStore?: AssociatedStoreNameDetails | null;
  AssociatedDistributor?: AssociatedNameDetails | null;
  ParentUserRole?: UserRole | null;
  ParentDistributor?: AssociatedNameDetails | null;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string | null;
  createdAt: string;
  UserRole: UserRole;
}

export interface UsersListingApiResType {
  users: User[];
  currentPage: number;
  totalPages: number;
  totalRes: number;
  pageVariable?: string;
  canInvite?: boolean;
  userType?: string;
}

export interface UsersPageProps {
  searchParams?: any;
}

export type LoginResponseData = {
  accessToken: string;
  refreshToken: string;
  relatedUsers?: RelatedUsers[];
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    associatedUserId: number;
    parentEntityId: number | null;
    parentEntityType: string | null;
    logo: string;
    name: string;
    primaryWarehouseId?: number | null;
  };
  loginTime: string;
  expiresIn: string;
};

export interface RelatedUsers {
  id: number;
  role: string;
  name: string;
  logo: string;
}

export interface LoginResponseType {
  status: string;
  data: LoginResponseData;
}
