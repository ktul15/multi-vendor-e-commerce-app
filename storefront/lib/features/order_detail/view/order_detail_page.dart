import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/config/injection_container.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/order_detail_model.dart';
import '../../order_history/widgets/order_status_badge.dart';
import '../../../shared/widgets/error_state.dart';
import '../../../shared/widgets/skeleton_box.dart';
import '../bloc/order_detail_cubit.dart';
import '../bloc/order_detail_state.dart';
import '../widgets/order_address_section.dart';
import '../widgets/order_detail_skeleton.dart';
import '../widgets/order_items_section.dart';
import '../widgets/order_payment_section.dart';
import '../widgets/order_status_timeline.dart';

class OrderDetailPage extends StatelessWidget {
  final String orderId;

  const OrderDetailPage({super.key, required this.orderId});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<OrderDetailCubit>()..loadOrder(orderId),
      child: const _OrderDetailView(),
    );
  }
}

// ── View ─────────────────────────────────────────────────────────────────────

class _OrderDetailView extends StatelessWidget {
  const _OrderDetailView();

  @override
  Widget build(BuildContext context) {
    return BlocListener<OrderDetailCubit, OrderDetailState>(
      listenWhen: (prev, curr) =>
          curr is OrderDetailLoaded && curr.cancelError != null,
      listener: (context, state) {
        if (state is OrderDetailLoaded && state.cancelError != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.cancelError!),
              backgroundColor: AppColors.error,
            ),
          );
          // Clear the error so it doesn't re-trigger
          context.read<OrderDetailCubit>().clearCancelError();
        }
      },
      child: BlocBuilder<OrderDetailCubit, OrderDetailState>(
        builder: (context, state) => switch (state) {
          OrderDetailInitial() || OrderDetailLoading() => Scaffold(
              appBar: AppBar(title: const Text('Order Details')),
              body: SkeletonContainer(child: const OrderDetailSkeleton()),
            ),
          OrderDetailError(:final message, :final orderId) => Scaffold(
              appBar: AppBar(title: const Text('Order Details')),
              body: ErrorState(
                message: message,
                onRetry: () =>
                    context.read<OrderDetailCubit>().loadOrder(orderId),
              ),
            ),
          OrderDetailLoaded() => _LoadedView(state: state),
        },
      ),
    );
  }
}

// ── Loaded ───────────────────────────────────────────────────────────────────

class _LoadedView extends StatelessWidget {
  final OrderDetailLoaded state;

  const _LoadedView({required this.state});

  @override
  Widget build(BuildContext context) {
    final order = state.order;

    return Scaffold(
      appBar: AppBar(
        title: Text(order.orderNumber, style: AppTextStyles.h5),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.base),
            child: OrderStatusBadge(status: order.overallStatus),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.base,
          vertical: AppSpacing.md,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status timeline
            OrderStatusTimeline(status: order.overallStatus),
            const SizedBox(height: AppSpacing.base),

            // Tracking number
            if (order.trackingNumber != null) ...[
              _TrackingNumberRow(trackingNumber: order.trackingNumber!),
              const SizedBox(height: AppSpacing.base),
            ],

            // Items
            OrderItemsSection(items: order.allItems),
            const SizedBox(height: AppSpacing.base),

            // Address
            OrderAddressSection(address: order.address),
            const SizedBox(height: AppSpacing.base),

            // Payment
            if (order.payment != null) ...[
              OrderPaymentSection(payment: order.payment!),
              const SizedBox(height: AppSpacing.base),
            ],

            // Order summary
            _OrderSummaryCard(order: order),
            const SizedBox(height: AppSpacing.base),

            // Cancellation reason
            if (order.cancellationReason != null) ...[
              _CancellationReasonCard(reason: order.cancellationReason!),
              const SizedBox(height: AppSpacing.base),
            ],

            // Cancel button
            if (order.isCancellable) ...[
              _CancelOrderButton(
                orderId: order.id,
                isCancelling: state.isCancelling,
              ),
              const SizedBox(height: AppSpacing.xl),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Tracking number ──────────────────────────────────────────────────────────

class _TrackingNumberRow extends StatelessWidget {
  final String trackingNumber;

  const _TrackingNumberRow({required this.trackingNumber});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        side: const BorderSide(color: AppColors.border),
      ),
      color: AppColors.surface,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.base,
          vertical: AppSpacing.md,
        ),
        child: Row(
          children: [
            const Icon(Icons.local_shipping_outlined,
                size: 20, color: AppColors.primary),
            const SizedBox(width: AppSpacing.sm),
            Text('Tracking', style: AppTextStyles.caption),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(
                trackingNumber,
                style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            IconButton(
              icon: const Icon(Icons.copy, size: 18),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
              onPressed: () {
                Clipboard.setData(ClipboardData(text: trackingNumber));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Tracking number copied'),
                    duration: Duration(seconds: 2),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

// ── Order summary ────────────────────────────────────────────────────────────

class _OrderSummaryCard extends StatelessWidget {
  final OrderDetailModel order;

  const _OrderSummaryCard({required this.order});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        side: const BorderSide(color: AppColors.border),
      ),
      color: AppColors.surface,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Order Summary', style: AppTextStyles.h5),
            const SizedBox(height: AppSpacing.md),
            _SummaryRow(label: 'Subtotal', amount: order.subtotal),
            if (order.discount > 0) ...[
              const SizedBox(height: AppSpacing.sm),
              _SummaryRow(
                  label: 'Discount', amount: -order.discount, isDiscount: true),
            ],
            if (order.tax > 0) ...[
              const SizedBox(height: AppSpacing.sm),
              _SummaryRow(label: 'Tax', amount: order.tax),
            ],
            const Divider(height: AppSpacing.xl, color: AppColors.divider),
            _SummaryRow(label: 'Total', amount: order.total, isTotal: true),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final double amount;
  final bool isTotal;
  final bool isDiscount;

  const _SummaryRow({
    required this.label,
    required this.amount,
    this.isTotal = false,
    this.isDiscount = false,
  });

  @override
  Widget build(BuildContext context) {
    final amountStr = isDiscount
        ? '-\$${amount.abs().toStringAsFixed(2)}'
        : '\$${amount.toStringAsFixed(2)}';

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: isTotal
              ? AppTextStyles.h5
              : AppTextStyles.body.copyWith(color: AppColors.textSecondary),
        ),
        Text(
          amountStr,
          style: isTotal
              ? AppTextStyles.h5.copyWith(color: AppColors.primary)
              : isDiscount
                  ? AppTextStyles.body.copyWith(color: AppColors.success)
                  : AppTextStyles.body.copyWith(fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}

// ── Cancellation reason ──────────────────────────────────────────────────────

class _CancellationReasonCard extends StatelessWidget {
  final String reason;

  const _CancellationReasonCard({required this.reason});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        side: BorderSide(color: AppColors.error.withAlpha(77)),
      ),
      color: AppColors.error.withAlpha(13),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.info_outline, size: 20, color: AppColors.error),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Cancellation Reason',
                    style: AppTextStyles.caption.copyWith(color: AppColors.error),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(reason, style: AppTextStyles.body),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Cancel button ────────────────────────────────────────────────────────────

class _CancelOrderButton extends StatelessWidget {
  final String orderId;
  final bool isCancelling;

  const _CancelOrderButton({
    required this.orderId,
    required this.isCancelling,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: isCancelling ? null : () => _showCancelDialog(context),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.error,
          side: const BorderSide(color: AppColors.error),
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
        ),
        icon: isCancelling
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.cancel_outlined),
        label: Text(isCancelling ? 'Cancelling...' : 'Cancel Order'),
      ),
    );
  }

  void _showCancelDialog(BuildContext context) {
    final reasonController = TextEditingController();

    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Cancel Order'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Are you sure you want to cancel this order?'),
            const SizedBox(height: AppSpacing.base),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                hintText: 'Reason (optional)',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
              maxLength: 500,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Keep Order'),
          ),
          FilledButton(
            onPressed: () {
              final reason = reasonController.text.trim();
              Navigator.of(dialogContext).pop();
              if (!context.mounted) return;
              context.read<OrderDetailCubit>().cancelOrder(
                    orderId,
                    reason: reason.isNotEmpty ? reason : null,
                  );
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.error,
            ),
            child: const Text('Cancel Order'),
          ),
        ],
      ),
    ).then((_) => reasonController.dispose());
  }
}
