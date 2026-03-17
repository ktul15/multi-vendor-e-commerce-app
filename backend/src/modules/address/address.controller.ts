import { Response } from 'express';
import { AuthRequest } from '../../types';
import { AddressService } from './address.service';
import catchAsync from '../../utils/catchAsync';
import { ApiResponse } from '../../utils/apiResponse';
import { CreateAddressInput, UpdateAddressInput } from './address.validation';

const addressService = new AddressService();

export class AddressController {
    create = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const input = req.body as CreateAddressInput;
        const address = await addressService.createAddress(userId, input);
        ApiResponse.created(res, address, 'Address created successfully');
    });

    list = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const addresses = await addressService.getAddresses(userId);
        ApiResponse.success(res, addresses, 'Addresses fetched successfully');
    });

    getOne = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const id = req.params.id as string;
        const address = await addressService.getAddress(userId, id);
        ApiResponse.success(res, address, 'Address fetched successfully');
    });

    update = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const id = req.params.id as string;
        const input = req.body as UpdateAddressInput;
        const address = await addressService.updateAddress(userId, id, input);
        ApiResponse.success(res, address, 'Address updated successfully');
    });

    remove = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const id = req.params.id as string;
        await addressService.deleteAddress(userId, id);
        ApiResponse.noContent(res);
    });

    setDefault = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const id = req.params.id as string;
        const address = await addressService.setDefault(userId, id);
        ApiResponse.success(res, address, 'Default address updated');
    });
}
