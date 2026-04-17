import { Router } from 'express';
import { AddressController } from './address.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, validateParams } from '../../middleware/validate';
import { addressParamSchema, createAddressSchema, updateAddressSchema } from './address.validation';

const router = Router();
const addressController = new AddressController();

// Addresses are customer-facing — require authenticated CUSTOMER role
router.use(authenticate, authorize('CUSTOMER'));

/**
 * @openapi
 * /addresses:
 *   post:
 *     tags: [Addresses]
 *     summary: Create a shipping address (Customer only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, phone, street, city, state, country, zipCode]
 *             properties:
 *               fullName: { type: string, example: Jane Smith }
 *               phone: { type: string, minLength: 7, maxLength: 20, example: "+1-555-0100" }
 *               street: { type: string, example: "123 Main St" }
 *               city: { type: string, example: New York }
 *               state: { type: string, example: NY }
 *               country: { type: string, minLength: 2, maxLength: 2, example: US }
 *               zipCode: { type: string, minLength: 3, maxLength: 10, example: "10001" }
 *               isDefault: { type: boolean, default: false }
 *     responses:
 *       201:
 *         description: Address created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — CUSTOMER role required
 */
router.post('/', validate(createAddressSchema), addressController.create);

/**
 * @openapi
 * /addresses:
 *   get:
 *     tags: [Addresses]
 *     summary: List the customer's saved addresses
 *     responses:
 *       200:
 *         description: Address list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       401:
 *         description: Unauthorized
 */
router.get('/', addressController.list);

/**
 * @openapi
 * /addresses/{id}:
 *   get:
 *     tags: [Addresses]
 *     summary: Get a single address by ID (Customer only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Address detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 */
router.get('/:id', validateParams(addressParamSchema), addressController.getOne);

/**
 * @openapi
 * /addresses/{id}:
 *   put:
 *     tags: [Addresses]
 *     summary: Update an address (Customer only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: At least one field required
 *             properties:
 *               fullName: { type: string }
 *               phone: { type: string }
 *               street: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               country: { type: string, minLength: 2, maxLength: 2 }
 *               zipCode: { type: string }
 *               isDefault: { type: boolean }
 *     responses:
 *       200:
 *         description: Address updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 */
router.put('/:id', validateParams(addressParamSchema), validate(updateAddressSchema), addressController.update);

/**
 * @openapi
 * /addresses/{id}:
 *   delete:
 *     tags: [Addresses]
 *     summary: Delete an address (Customer only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Address deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 */
router.delete('/:id', validateParams(addressParamSchema), addressController.remove);

/**
 * @openapi
 * /addresses/{id}/default:
 *   patch:
 *     tags: [Addresses]
 *     summary: Set an address as the default (Customer only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Default address updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 */
// No body expected — validateParams is sufficient; no validate() call needed
router.patch('/:id/default', validateParams(addressParamSchema), addressController.setDefault);

export default router;
