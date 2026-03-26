import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/config/injection_container.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../bloc/order_list_cubit.dart';
import '../bloc/order_list_state.dart';
import '../widgets/order_card.dart';

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
                  const Center(child: CircularProgressIndicator()),
                OrderListError(:final message) =>
                  _ErrorBody(message: message),
                OrderListLoaded(:final orders, :final isLoadingMore) =>
                  orders.isEmpty
                      ? const _EmptyBody()
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

// ── Empty state ──────────────────────────────────────────────────────────────

class _EmptyBody extends StatelessWidget {
  const _EmptyBody();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.receipt_long_outlined,
            size: 72,
            color: AppColors.textSecondary.withAlpha(128),
          ),
          const SizedBox(height: AppSpacing.base),
          Text(
            'No orders yet',
            style: AppTextStyles.h5.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Your order history will appear here',
            style: AppTextStyles.body.copyWith(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

// ── Error state ──────────────────────────────────────────────────────────────

class _ErrorBody extends StatelessWidget {
  final String message;

  const _ErrorBody({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off_rounded, size: 72, color: Colors.grey),
            const SizedBox(height: AppSpacing.base),
            Text(
              'Something went wrong',
              style: AppTextStyles.h5.copyWith(color: AppColors.textPrimary),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              message,
              style:
                  AppTextStyles.body.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xl),
            ElevatedButton.icon(
              onPressed: () => context.read<OrderListCubit>().refresh(),
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
}
