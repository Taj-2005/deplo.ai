import { gql } from "graphql-tag";

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  type User {
    id: ID!
    email: String!
    name: String!
    avatarUrl: String
    githubLogin: String!
    createdAt: DateTime!
    deployments: [Deployment!]!
    repositories: [Repository!]!
  }

  type Repository {
    id: ID!
    name: String!
    fullName: String!
    htmlUrl: String!
    defaultBranch: String!
    isPrivate: Boolean!
    language: String
    description: String
    updatedAt: DateTime!
    createdAt: DateTime!
    deployments: [Deployment!]!
  }

  type DetectedStack {
    frontend: String
    backend: String
    packageManager: String!
    buildCommand: String
    outputDir: String
    nodeVersion: String
  }

  type EnvVariableInfo {
    key: String!
    isRequired: Boolean!
  }

  type Deployment {
    id: ID!
    status: DeploymentStatus!
    branch: String!
    detectedStack: DetectedStack
    envVariables: [EnvVariableInfo!]!
    frontendUrl: String
    backendUrl: String
    logs: [String!]!
    error: String
    duration: Int
    createdAt: DateTime!
    updatedAt: DateTime!
    repository: Repository!
    user: User!
  }

  enum DeploymentStatus {
    PENDING
    ANALYZING
    WAITING_FOR_ENV
    DEPLOYING_BACKEND
    BACKEND_READY
    DEPLOYING_FRONTEND
    COMPLETED
    FAILED
    CANCELLED
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type SyncResult {
    synced: Int!
  }

  input EnvVariableInput {
    key: String!
    value: String!
  }

  input StartDeploymentInput {
    repositoryId: ID!
  }

  input ProvideEnvVarsInput {
    deploymentId: ID!
    envVars: [EnvVariableInput!]!
  }

  type Query {
    me: User
    myRepositories: [Repository!]!
    myDeployments: [Deployment!]!
    deployment(id: ID!): Deployment
  }

  type Mutation {
    githubLogin(code: String!): AuthPayload!
    syncRepositories: SyncResult!
    startDeployment(input: StartDeploymentInput!): Deployment!
    provideEnvVariables(input: ProvideEnvVarsInput!): Deployment!
    cancelDeployment(id: ID!): Deployment!
  }
`;
