import { getServerEnv } from "@/lib/server/env";
import { prisma } from "@/lib/server/db";
import {
  executeBootstrapOrchestration,
  runBootstrapCli,
} from "@/features/auth/bootstrap";

async function main() {
  await executeBootstrapOrchestration({
    runner: () => runBootstrapCli(() => getServerEnv(), prisma, console),
    disconnect: () => prisma.$disconnect(),
    setExitCode: (code) => {
      process.exitCode = code;
    },
    logger: console,
  });
}

main().catch(() => {
  process.exitCode = 1;
});
