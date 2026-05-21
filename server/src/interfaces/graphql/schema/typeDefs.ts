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

  type EnvVariable {
    key: String!
    value: String!
    isRequired: Boolean!
    source: String!
  }

  type Deployment {
    id: ID!
    status: DeploymentStatus!
    detectedStack: DetectedStack
    envVariables: [EnvVariable!]!
    frontendUrl: String
    backendUrl: String
    logs: [String!]!
    error: String
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
    startDeployment(input: StartDeploymentInput!): Deployment!
    provideEnvVariables(input: ProvideEnvVarsInput!): Deployment!
    cancelDeployment(id: ID!): Deployment!
  }
`;
