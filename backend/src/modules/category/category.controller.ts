import { Request, Response, NextFunction } from 'express';
import { CategoryService } from './category.service';
import catchAsync from '../../utils/catchAsync';
import { ApiResponse } from '../../utils/apiResponse';

const categoryService = new CategoryService();

export class CategoryController {
    getAllCategories = catchAsync(async (req: Request, res: Response) => {
        const categories = await categoryService.getAllCategories();
        ApiResponse.success(res, categories, 'Categories fetched successfully');
    });

    createCategory = catchAsync(async (req: Request, res: Response) => {
        const newCategory = await categoryService.createCategory(req.body);
        ApiResponse.created(res, newCategory, 'Category created successfully');
    });

    updateCategory = catchAsync(async (req: Request, res: Response) => {
        const id = req.params.id as string;
        const updatedCategory = await categoryService.updateCategory(id, req.body);
        ApiResponse.success(res, updatedCategory, 'Category updated successfully');
    });

    deleteCategory = catchAsync(async (req: Request, res: Response) => {
        const id = req.params.id as string;
        await categoryService.deleteCategory(id);
        ApiResponse.success(res, null, 'Category deleted successfully');
    });
}
