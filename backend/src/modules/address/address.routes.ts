import { Router } from 'express';
import { AddressController } from './address.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, validateParams } from '../../middleware/validate';
import { addressParamSchema, createAddressSchema, updateAddressSchema } from './address.validation';

const router = Router();
const addressController = new AddressController();

// Addresses are customer-facing — require authenticated CUSTOMER role
router.use(authenticate, authorize('CUSTOMER'));

router.post('/', validate(createAddressSchema), addressController.create);
router.get('/', addressController.list);
router.get('/:id', validateParams(addressParamSchema), addressController.getOne);
router.put('/:id', validateParams(addressParamSchema), validate(updateAddressSchema), addressController.update);
router.delete('/:id', validateParams(addressParamSchema), addressController.remove);
// No body expected — validateParams is sufficient; no validate() call needed
router.patch('/:id/default', validateParams(addressParamSchema), addressController.setDefault);

export default router;
