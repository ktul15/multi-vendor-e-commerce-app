import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { CreateAddressInput, UpdateAddressInput } from './address.validation';
import { Address } from '../../generated/prisma/client';

export class AddressService {
    async createAddress(userId: string, input: CreateAddressInput): Promise<Address> {
        const { isDefault, ...fields } = input;

        if (isDefault) {
            const [, address] = await prisma.$transaction([
                // No NOT: { id } here — the address doesn't exist yet, so no double-write risk
                prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } }),
                prisma.address.create({ data: { ...fields, isDefault: true, userId } }),
            ]);
            return address;
        }

        return prisma.address.create({ data: { ...fields, isDefault: false, userId } });
    }

    async getAddresses(userId: string): Promise<Address[]> {
        return prisma.address.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });
    }

    async getAddress(userId: string, id: string): Promise<Address> {
        const address = await prisma.address.findFirst({ where: { id, userId } });
        if (!address) throw ApiError.notFound('Address not found');
        return address;
    }

    async updateAddress(userId: string, id: string, input: UpdateAddressInput): Promise<Address> {
        const existing = await prisma.address.findFirst({ where: { id, userId } });
        if (!existing) throw ApiError.notFound('Address not found');

        if (input.isDefault) {
            const [, address] = await prisma.$transaction([
                // Exclude the target address to avoid a redundant write on the same row
                prisma.address.updateMany({ where: { userId, isDefault: true, NOT: { id } }, data: { isDefault: false } }),
                prisma.address.update({ where: { id }, data: input }),
            ]);
            return address;
        }

        return prisma.address.update({ where: { id }, data: input });
    }

    async deleteAddress(userId: string, id: string): Promise<void> {
        const existing = await prisma.address.findFirst({ where: { id, userId } });
        if (!existing) throw ApiError.notFound('Address not found');
        await prisma.address.delete({ where: { id } });
    }

    async setDefault(userId: string, id: string): Promise<Address> {
        const existing = await prisma.address.findFirst({ where: { id, userId } });
        if (!existing) throw ApiError.notFound('Address not found');

        const [, address] = await prisma.$transaction([
            // Exclude the target address to avoid a redundant write on the same row
            prisma.address.updateMany({ where: { userId, isDefault: true, NOT: { id } }, data: { isDefault: false } }),
            prisma.address.update({ where: { id }, data: { isDefault: true } }),
        ]);
        return address;
    }
}
