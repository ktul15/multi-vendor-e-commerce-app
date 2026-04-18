import { hashPassword } from './src/utils/password';
import { prisma } from './src/config/prisma';

async function run() {
  const hashedPassword = await hashPassword('admin123');
  await prisma.user.update({
    where: { email: 'admin@ecommerce.com' },
    data: { password: hashedPassword, role: 'ADMIN' }
  });
  console.log('Password updated successfully.');
}
run().catch(console.error).finally(() => process.exit(0));
