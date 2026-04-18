import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/app_router.dart';
import '../../../core/config/injection_container.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../repositories/review_repository.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../../auth/bloc/auth_state.dart';
import '../../../shared/widgets/skeleton_box.dart';
import '../bloc/review_list_cubit.dart';
import '../bloc/review_list_state.dart';
import '../widgets/rating_breakdown.dart';
import '../widgets/review_list_skeleton.dart';
import '../widgets/review_tile.dart';

class ReviewListPage extends StatefulWidget {
  final String productId;
  final String productName;
  final double avgRating;
  final int reviewCount;

  const ReviewListPage({
    super.key,
    required this.productId,
    required this.productName,
    required this.avgRating,
    required this.reviewCount,
  });

  @override
  State<ReviewListPage> createState() => _ReviewListPageState();
}

class _ReviewListPageState extends State<ReviewListPage> {
  late final ReviewListCubit _cubit;
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _cubit = ReviewListCubit(
      repository: sl<ReviewRepository>(),
      productId: widget.productId,
    )..loadReviews();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _cubit.loadMore();
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _cubit.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _cubit,
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: const Text('Reviews'),
          actions: [
            TextButton.icon(
              onPressed: () async {
                final wrote = await context.pushNamed<bool>(
                  AppRoutes.writeReviewName,
                  pathParameters: {'id': widget.productId},
                );
                if (wrote == true) _cubit.loadReviews();
              },
              icon: const Icon(Icons.rate_review_outlined, size: 18),
              label: const Text('Write'),
            ),
          ],
        ),
        body: BlocBuilder<ReviewListCubit, ReviewListState>(
          builder: (context, state) {
            if (state case ReviewListLoaded loaded) {
              return _buildLoaded(context, loaded);
            }
            return SkeletonContainer(child: const ReviewListSkeleton());
          },
        ),
      ),
    );
  }

  Widget _buildLoaded(BuildContext context, ReviewListLoaded loaded) {
            return RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () => _cubit.loadReviews(),
              child: CustomScrollView(
                controller: _scrollController,
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  // Rating breakdown header
                  SliverToBoxAdapter(
                    child: Container(
                      padding: const EdgeInsets.all(AppSpacing.base),
                      color: AppColors.surface,
                      child: RatingBreakdown(
                        avgRating: widget.avgRating,
                        totalReviews: widget.reviewCount,
                        ratingCounts: loaded.ratingCounts,
                        selectedRating: loaded.filterRating,
                        onRatingTap: _cubit.filterByRating,
                        isApproximate: !loaded.isBreakdownComplete,
                      ),
                    ),
                  ),

                  // Sort bar
                  SliverToBoxAdapter(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.base,
                        vertical: AppSpacing.sm,
                      ),
                      child: Row(
                        children: [
                          Text(
                            '${loaded.total} reviews',
                            style: AppTextStyles.caption,
                          ),
                          const Spacer(),
                          _SortChip(
                            label: 'Newest',
                            isSelected: loaded.sort == 'newest',
                            onTap: () => _cubit.changeSort('newest'),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          _SortChip(
                            label: 'Highest',
                            isSelected: loaded.sort == 'highest',
                            onTap: () => _cubit.changeSort('highest'),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          _SortChip(
                            label: 'Lowest',
                            isSelected: loaded.sort == 'lowest',
                            onTap: () => _cubit.changeSort('lowest'),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Loading state
                  if (loaded.isLoading)
                    const SliverFillRemaining(
                      child: Center(child: CircularProgressIndicator()),
                    )
                  // Empty state
                  else if (loaded.reviews.isEmpty)
                    SliverFillRemaining(
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.rate_review_outlined,
                              size: 72,
                              color: AppColors.textSecondary.withAlpha(128),
                            ),
                            const SizedBox(height: AppSpacing.base),
                            Text(
                              loaded.filterRating != null
                                  ? 'No ${loaded.filterRating}-star reviews'
                                  : 'No reviews yet',
                              style: AppTextStyles.h5.copyWith(
                                color: AppColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            Text(
                              'Be the first to review this product',
                              style: AppTextStyles.body.copyWith(
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  // Reviews list
                  else
                    SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          if (index == loaded.reviews.length) {
                            return const Padding(
                              padding: EdgeInsets.all(AppSpacing.base),
                              child:
                                  Center(child: CircularProgressIndicator()),
                            );
                          }
                          final review = loaded.reviews[index];
                          final authState = sl<AuthBloc>().state;
                          final currentUserId = authState is AuthAuthenticated
                              ? authState.user['id'] as String?
                              : null;
                          final isOwn = currentUserId != null &&
                              review.userId == currentUserId;
                          return Column(
                            children: [
                              ReviewTile(
                                review: review,
                                isOwn: isOwn,
                                onEdit: () async {
                                  final wrote = await context.pushNamed<bool>(
                                    AppRoutes.writeReviewName,
                                    pathParameters: {
                                      'id': widget.productId,
                                    },
                                    extra: review,
                                  );
                                  if (wrote == true) _cubit.loadReviews();
                                },
                                onDelete: () async {
                                  final confirm = await showDialog<bool>(
                                    context: context,
                                    builder: (_) => AlertDialog(
                                      title: const Text('Delete Review'),
                                      content: const Text(
                                        'Are you sure you want to delete this review?',
                                      ),
                                      actions: [
                                        TextButton(
                                          onPressed: () =>
                                              Navigator.pop(context, false),
                                          child: const Text('Cancel'),
                                        ),
                                        TextButton(
                                          onPressed: () =>
                                              Navigator.pop(context, true),
                                          child: const Text('Delete'),
                                        ),
                                      ],
                                    ),
                                  );
                                  if (confirm == true) {
                                    try {
                                      await sl<ReviewRepository>()
                                          .deleteReview(review.id);
                                      _cubit.removeReview(review.id);
                                    } catch (e) {
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context)
                                            .showSnackBar(
                                          SnackBar(
                                            content: Text(e.toString()),
                                            backgroundColor: AppColors.error,
                                          ),
                                        );
                                      }
                                    }
                                  }
                                },
                              ),
                              if (index < loaded.reviews.length - 1)
                                const Divider(
                                  height: 1,
                                  indent: AppSpacing.base,
                                ),
                            ],
                          );
                        },
                        childCount: loaded.reviews.length +
                            (loaded.isLoadingMore ? 1 : 0),
                      ),
                    ),
                ],
              ),
            );
  }
}

class _SortChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _SortChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.xs,
        ),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.full),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
          ),
        ),
        child: Text(
          label,
          style: AppTextStyles.caption.copyWith(
            color: isSelected ? Colors.white : AppColors.textSecondary,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}
