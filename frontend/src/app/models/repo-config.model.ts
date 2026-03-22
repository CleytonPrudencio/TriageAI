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
