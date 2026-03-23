export interface RepoConfig {
  id: number;
  name: string;
  provider: string;
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
  reviewerUsername: string;
}

export interface RepoConfigRequest {
  name: string;
  provider: string;
  repoOwner: string;
  repoName: string;
  apiToken: string;
  defaultBranch: string;
  reviewerUsername?: string;
}

export interface AutoFixResponse {
  status: string;
  branch: string;
  prUrl: string;
  message: string;
  filesChanged: number;
}

export interface GitConnection {
  id: number;
  provider: string;
  username: string;
  avatarUrl?: string;
}

export interface GitRepo {
  fullName: string;
  owner: string;
  name: string;
  defaultBranch: string;
  isPrivate: boolean;
  language: string;
  updatedAt: string;
}
