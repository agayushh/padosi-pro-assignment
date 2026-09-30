import type { User } from "@prisma/client";

export type PublicUser = {
  id: number;
  email: string;
  emailVerified: boolean;
  name: string | null;
  mobile: string | null;
  address: string | null;
  businessName: string | null;
  profileCompleted: boolean;
  selectedTaskCount: number;
};

export function toPublicUser(user: User, selectedTaskCount: number): PublicUser {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
    name: user.name,
    mobile: user.mobile,
    address: user.address,
    businessName: user.businessName,
    profileCompleted: user.profileCompleted,
    selectedTaskCount,
  };
}
