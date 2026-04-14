import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/config/injection_container.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/error_state.dart';
import '../../../shared/widgets/skeleton_box.dart';
import '../bloc/order_list_cubit.dart';
import '../bloc/order_list_state.dart';
import '../widgets/order_card.dart';
import '../widgets/order_history_skeleton.dart';

class OrderHistoryPage extends StatelessWidget {
  const OrderHistoryPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<OrderListCubit>()..loadOrders(),
      child: const _OrderHistoryView(),
    );
  }
}

// ── Filter tab data ──────────────────────────────────────────────────────────

class _FilterTab {
  final String label;
  final String? status;

  const _FilterTab(this.label, this.status);
}

const _filterTabs = [
  _FilterTab('All', null),
  _FilterTab('Pending', 'PENDING'),
  _FilterTab('Confirmed', 'CONFIRMED'),
  _FilterTab('Shipped', 'SHIPPED'),
  _FilterTab('Delivered', 'DELIVERED'),
  _FilterTab('Cancelled', 'CANCELLED'),
];

// ── View ─────────────────────────────────────────────────────────────────────

class _OrderHistoryView extends StatefulWidget {
  const _OrderHistoryView();

  @override
  State<_OrderHistoryView> createState() => _OrderHistoryViewState();
}

class _OrderHistoryViewState extends State<_OrderHistoryView> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController
      ..removeListener(_onScroll)
      ..dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      context.read<OrderListCubit>().loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Orders'),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 1,
      ),
      body: Column(
        children: [
          // ── Filter tabs ──
          const _FilterTabBar(),

          // ── Order list ──
          Expanded(
            child: BlocBuilder<OrderListCubit, OrderListState>(
              builder: (context, state) => switch (state) {
                OrderListInitial() ||
                OrderListLoading() =>
                  SkeletonContainer(child: const OrderHistorySkeleton()),
                OrderListError(:final message) => ErrorState(
                    message: message,
                    onRetry: () => context.read<OrderListCubit>().refresh(),
                  ),
                OrderListLoaded(:final orders, :final isLoadingMore) =>
                  orders.isEmpty
                      ? const EmptyState(
                          icon: Icons.receipt_long_outlined,
                          title: 'No orders yet',
                          subtitle: 'Your order history will appear here',
                        )
                      : RefreshIndicator(
                          color: AppColors.primary,
                          onRefresh: () =>
                              context.read<OrderListCubit>().refresh(),
                          child: ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.only(
                              top: AppSpacing.sm,
                              bottom: AppSpacing.xl,
                            ),
                            itemCount: orders.length + (isLoadingMore ? 1 : 0),
                            itemBuilder: (context, index) {
                              if (index == orders.length) {
                                return const Padding(
                                  padding: EdgeInsets.all(AppSpacing.base),
                                  child: Center(
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  ),
                                );
                              }
                              return OrderCard(order: orders[index]);
                            },
                          ),
                        ),
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ── Filter tab bar ───────────────────────────────────────────────────────────

class _FilterTabBar extends StatelessWidget {
  const _FilterTabBar();

  @override
  Widget build(BuildContext context) {
    return BlocSelector<OrderListCubit, OrderListState, String?>(
      selector: (state) {
        if (state is OrderListLoaded) return state.activeFilter;
        if (state is OrderListError) return state.activeFilter;
        return null;
      },
      builder: (context, activeFilter) {
        return Container(
          color: AppColors.surface,
          height: 48,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
            itemCount: _filterTabs.length,
            separatorBuilder: (_, _) => const SizedBox(width: AppSpacing.sm),
            itemBuilder: (context, index) {
              final tab = _filterTabs[index];
              final isActive = tab.status == activeFilter;
              return Center(
                child: ChoiceChip(
                  label: Text(tab.label),
                  selected: isActive,
                  onSelected: (_) {
                    context.read<OrderListCubit>().changeFilter(tab.status);
                  },
                  selectedColor: AppColors.primary,
                  backgroundColor: AppColors.background,
                  labelStyle: AppTextStyles.caption.copyWith(
                    color: isActive ? Colors.white : AppColors.textSecondary,
                    fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                  ),
                  side: BorderSide(
                    color: isActive ? AppColors.primary : AppColors.border,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                  showCheckmark: false,
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                ),
              );
            },
          ),
        );
      },
    );
  }
}

