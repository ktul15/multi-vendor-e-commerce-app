import { Response } from 'express';
import { AuthRequest } from '../../types';
import { ReviewService } from './review.service';
import catchAsync from '../../utils/catchAsync';
import { ApiResponse } from '../../utils/apiResponse';
import { GetReviewsQueryInput, GetMyReviewsQueryInput } from './review.validation';

const reviewService = new ReviewService();

export class ReviewController {
    create = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const review = await reviewService.createReview(userId, req.body);
        ApiResponse.created(res, review, 'Review created successfully');
    });

    getProductReviews = catchAsync(async (req: AuthRequest, res: Response) => {
        const productId = req.params.productId as string;
        const query = req.query as unknown as GetReviewsQueryInput;
        const reviews = await reviewService.getProductReviews(productId, query);
        ApiResponse.success(res, reviews, 'Reviews fetched successfully');
    });

    getMyReviews = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const query = req.query as unknown as GetMyReviewsQueryInput;
        const reviews = await reviewService.getMyReviews(userId, query);
        ApiResponse.success(res, reviews, 'Reviews fetched successfully');
    });

    update = catchAsync(async (req: AuthRequest, res: Response) => {
        const reviewId = req.params.reviewId as string;
        const userId = req.user!.userId;
        const review = await reviewService.updateReview(reviewId, userId, req.body);
        ApiResponse.success(res, review, 'Review updated successfully');
    });

    delete = catchAsync(async (req: AuthRequest, res: Response) => {
        const reviewId = req.params.reviewId as string;
        const userId = req.user!.userId;
        await reviewService.deleteReview(reviewId, userId);
        ApiResponse.noContent(res);
    });
}
