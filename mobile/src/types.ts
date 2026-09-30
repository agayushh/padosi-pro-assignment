export type User = {
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

export type TaskItem = {
  id: number;
  name: string;
  description: string;
};

export type Category = {
  id: number;
  name: string;
  description: string;
  tasks: TaskItem[];
};

export type SelectedTask = TaskItem & {
  categoryName: string;
};

export type Selection = {
  tasks: SelectedTask[];
  categories: Category[];
};

export type Session = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  user: User;
};

export type OtpChallenge = {
  email: string;
  expiresAt: string;
  resendAvailableAt: string;
  retryAfterSeconds: number;
};
