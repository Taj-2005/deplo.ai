import { PrismaClient } from "@prisma/client";
import { encrypt } from "../src/shared/utils/crypto";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("Seeding database...");

  const existingUser = await prisma.user.findFirst({
    where: { githubLogin: "demo-user" },
  });

  if (!existingUser) {
    const user = await prisma.user.create({
      data: {
        email: "demo@deplo.ai",
        name: "Demo User",
        githubId: "999999",
        githubLogin: "demo-user",
        githubAccessToken: encrypt("demo-token"),
        avatarUrl: "https://avatars.githubusercontent.com/u/999999",
      },
    });

    await prisma.repository.create({
      data: {
        userId: user.id,
        githubRepoId: "123456",
        name: "my-nextjs-app",
        fullName: "demo-user/my-nextjs-app",
        htmlUrl: "https://github.com/demo-user/my-nextjs-app",
        cloneUrl: "https://github.com/demo-user/my-nextjs-app.git",
        defaultBranch: "main",
        isPrivate: false,
        language: "TypeScript",
        description: "A demo Next.js application",
      },
    });

    console.log(`Created demo user: ${user.email}`);
  } else {
    console.log("Demo user already exists, skipping seed");
  }

  console.log("Seeding complete");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
