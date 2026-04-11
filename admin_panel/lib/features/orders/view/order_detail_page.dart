import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../bloc/admin_order_cubit.dart';
import '../bloc/admin_order_state.dart';
import '../models/admin_order_detail_model.dart';
import '../widgets/order_status_badge.dart';

final _dateFormat = DateFormat('MMM d, yyyy');
final _dateTimeFormat = DateFormat('MMM d, yyyy · h:mm a');
final _currencyFormat = NumberFormat.currency(symbol: '\$');

class OrderDetailPage extends StatefulWidget {
  final String orderId;

  const OrderDetailPage({super.key, required this.orderId});

  @override
  State<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends State<OrderDetailPage> {
  @override
  void initState() {
    super.initState();
    // Deferred so the cubit is available in the widget tree.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final cubit = context.read<AdminOrderCubit>();
      if (cubit.state is AdminOrderLoaded) {
        cubit.loadOrderDetail(widget.orderId);
      } else {
        // Deep-link case: list not loaded yet — load it first, then
        // fetch the detail once the cubit reaches AdminOrderLoaded.
        cubit.ensureLoaded().then((_) {
          if (mounted) cubit.loadOrderDetail(widget.orderId);
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AdminOrderCubit, AdminOrderState>(
      builder: (context, state) {
        return switch (state) {
          AdminOrderInitial() ||
          AdminOrderLoading() =>
            _loadingScaffold(),
          AdminOrderError(:final message) => _errorScaffold(
              message,
              // The list failed to load — retry by reloading the list,
              // which will keep us on this route once orders are available.
              onRetry: () => context.read<AdminOrderCubit>().load(),
            ),
          AdminOrderLoaded() => _buildFromLoaded(state),
        };
      },
    );
  }

  Widget _buildFromLoaded(AdminOrderLoaded state) {
    if (state.isDetailLoading && state.selectedOrderDetail == null) {
      return _loadingScaffold();
    }
    if (state.detailError != null && state.selectedOrderDetail == null) {
      return _errorScaffold(
        state.detailError!,
        onRetry: () =>
            context.read<AdminOrderCubit>().loadOrderDetail(widget.orderId),
      );
    }
    if (state.selectedOrderDetail == null) {
      return _loadingScaffold();
    }
    return _OrderDetailView(order: state.selectedOrderDetail!);
  }

  Widget _loadingScaffold() {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Order Detail'),
        titleTextStyle:
            AppTextStyles.h5.copyWith(color: AppColors.textPrimary),
      ),
      body: const Center(child: CircularProgressIndicator()),
    );
  }

  Widget _errorScaffold(String message, {required VoidCallback onRetry}) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Order Detail'),
        titleTextStyle:
            AppTextStyles.h5.copyWith(color: AppColors.textPrimary),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded,
                  size: 64, color: AppColors.error),
              const SizedBox(height: AppSpacing.base),
              Text(
                'Something went wrong',
                style: AppTextStyles.h5,
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                message,
                style: AppTextStyles.body
                    .copyWith(color: AppColors.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xl),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Try Again'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Detail view ───────────────────────────────────────────────────────────────

class _OrderDetailView extends StatelessWidget {
  final AdminOrderDetailModel order;

  const _OrderDetailView({required this.order});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 1,
        title: Text(order.orderNumber),
        titleTextStyle:
            AppTextStyles.h5.copyWith(color: AppColors.textPrimary),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.base),
        children: [
          // ── Order Summary ──────────────────────────────────────────────────
          _DetailSection(
            title: 'Order Summary',
            children: [
              _DetailRow(label: 'Order #', value: order.orderNumber),
              _DetailRow(
                label: 'Date',
                value: _dateFormat.format(order.createdAt.toLocal()),
              ),
              _DetailRowWidget(
                label: 'Status',
                child: OrderStatusBadge(
                  status: order.vendorOrders.isNotEmpty
                      ? order.vendorOrders.first.status
                      : 'PENDING',
                ),
              ),
              _DetailRow(
                label: 'Subtotal',
                value: _currencyFormat.format(order.subtotal),
              ),
              if (order.discount > 0)
                _DetailRow(
                  label: 'Discount',
                  value: '–${_currencyFormat.format(order.discount)}',
                  valueColor: AppColors.success,
                ),
              _DetailRow(
                label: 'Tax',
                value: _currencyFormat.format(order.tax),
              ),
              _DetailRow(
                label: 'Total',
                value: _currencyFormat.format(order.total),
                valueBold: true,
              ),
              if (order.notes != null && order.notes!.isNotEmpty)
                _DetailRow(label: 'Notes', value: order.notes!),
            ],
          ),
          const SizedBox(height: AppSpacing.base),

          // ── Customer ───────────────────────────────────────────────────────
          _DetailSection(
            title: 'Customer',
            children: [
              _DetailRow(label: 'Name', value: order.customer.name),
              _DetailRow(label: 'Email', value: order.customer.email),
            ],
          ),
          const SizedBox(height: AppSpacing.base),

          // ── Vendor Orders ─────────────────────────────────────────────────
          for (final vendorOrder in order.vendorOrders) ...[
            _VendorOrderSection(vendorOrder: vendorOrder),
            const SizedBox(height: AppSpacing.base),
          ],

          // ── Payment ────────────────────────────────────────────────────────
          if (order.payment != null) ...[
            _DetailSection(
              title: 'Payment',
              children: [
                _DetailRow(label: 'Method', value: order.payment!.method),
                _DetailRow(label: 'Status', value: order.payment!.status),
                _DetailRow(
                  label: 'Paid At',
                  value: order.payment!.paidAt != null
                      ? _dateTimeFormat
                          .format(order.payment!.paidAt!.toLocal())
                      : 'Pending',
                  valueColor: order.payment!.paidAt != null
                      ? AppColors.success
                      : AppColors.warning,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.base),
          ],

          // ── Delivery Address ───────────────────────────────────────────────
          if (order.address != null) ...[
            _DetailSection(
              title: 'Delivery Address',
              children: [
                _DetailRow(label: 'Street', value: order.address!.street),
                _DetailRow(label: 'City', value: order.address!.city),
                _DetailRow(label: 'State', value: order.address!.state),
                _DetailRow(
                    label: 'Postal Code', value: order.address!.postalCode),
                _DetailRow(label: 'Country', value: order.address!.country),
              ],
            ),
            const SizedBox(height: AppSpacing.base),
          ],

          // ── Promo Code ────────────────────────────────────────────────────
          if (order.promoCode != null) ...[
            _DetailSection(
              title: 'Promo Code',
              children: [
                _DetailRow(label: 'Code', value: order.promoCode!.code),
                _DetailRow(
                    label: 'Discount Type',
                    value: order.promoCode!.discountType),
                _DetailRow(
                  label: 'Discount Value',
                  value: order.promoCode!.discountType == 'PERCENTAGE'
                      ? '${order.promoCode!.discountValue.toStringAsFixed(1)}%'
                      : _currencyFormat.format(order.promoCode!.discountValue),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.base),
          ],

          const SizedBox(height: AppSpacing.xl),
        ],
      ),
    );
  }
}

// ── Vendor order section ──────────────────────────────────────────────────────

class _VendorOrderSection extends StatelessWidget {
  final AdminVendorOrderModel vendorOrder;

  const _VendorOrderSection({required this.vendorOrder});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    'Store: ${vendorOrder.storeName}',
                    style: AppTextStyles.h6,
                  ),
                ),
                OrderStatusBadge(status: vendorOrder.status),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            const Divider(height: 1, color: AppColors.border),
            const SizedBox(height: AppSpacing.sm),
            if (vendorOrder.trackingNumber != null) ...[
              _DetailRow(
                label: 'Tracking #',
                value: vendorOrder.trackingNumber!,
              ),
              if (vendorOrder.trackingCarrier != null)
                _DetailRow(
                  label: 'Carrier',
                  value: vendorOrder.trackingCarrier!,
                ),
              const SizedBox(height: AppSpacing.sm),
              const Divider(height: 1, color: AppColors.border),
              const SizedBox(height: AppSpacing.sm),
            ],
            for (final item in vendorOrder.items)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: _OrderItemRow(item: item),
              ),
            const Divider(height: 1, color: AppColors.border),
            const SizedBox(height: AppSpacing.sm),
            _DetailRow(
              label: 'Subtotal',
              value: _currencyFormat.format(vendorOrder.subtotal),
              valueBold: true,
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderItemRow extends StatelessWidget {
  final AdminOrderItemModel item;

  const _OrderItemRow({required this.item});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Thumbnail
        if (item.imageUrl != null)
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: Image.network(
              item.imageUrl!,
              width: 40,
              height: 40,
              fit: BoxFit.cover,
              errorBuilder: (_, e, s) => _imagePlaceholder(),
            ),
          )
        else
          _imagePlaceholder(),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item.productName,
                style: AppTextStyles.body
                    .copyWith(fontWeight: FontWeight.w500),
              ),
              Text(
                [
                  'SKU: ${item.sku}',
                  if (item.size != null) item.size!,
                  if (item.color != null) item.color!,
                ].join(' · '),
                style: AppTextStyles.caption
                    .copyWith(color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '${item.quantity}× ${_currencyFormat.format(item.price)}',
              style: AppTextStyles.caption
                  .copyWith(color: AppColors.textSecondary),
            ),
            Text(
              _currencyFormat.format(item.subtotal),
              style: AppTextStyles.body
                  .copyWith(fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ],
    );
  }

  Widget _imagePlaceholder() {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppColors.border),
      ),
      child: const Icon(
        Icons.image_outlined,
        size: 20,
        color: AppColors.textSecondary,
      ),
    );
  }
}

// ── Detail section card ───────────────────────────────────────────────────────

class _DetailSection extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _DetailSection({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: AppTextStyles.h6),
            const SizedBox(height: AppSpacing.sm),
            const Divider(height: 1, color: AppColors.border),
            for (final child in children) ...[
              const SizedBox(height: AppSpacing.sm),
              child,
            ],
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  final bool valueBold;

  const _DetailRow({
    required this.label,
    required this.value,
    this.valueColor,
    this.valueBold = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: AppTextStyles.body.copyWith(color: AppColors.textSecondary),
        ),
        Text(
          value,
          style: AppTextStyles.body.copyWith(
            fontWeight: valueBold ? FontWeight.w700 : FontWeight.w500,
            color: valueColor ?? AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}

class _DetailRowWidget extends StatelessWidget {
  final String label;
  final Widget child;

  const _DetailRowWidget({required this.label, required this.child});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: AppTextStyles.body.copyWith(color: AppColors.textSecondary),
        ),
        child,
      ],
    );
  }
}
