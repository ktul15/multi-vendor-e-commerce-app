import { prisma } from './src/config/prisma';

async function run() {
  const users = await prisma.user.findMany({ where: { email: 'admin@ecommerce.com' } });
  console.log(JSON.stringify(users, null, 2));
}
run().catch(console.error).finally(() => process.exit(0));
