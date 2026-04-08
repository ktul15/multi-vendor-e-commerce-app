import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../bloc/vendor_cubit.dart';
import '../bloc/vendor_state.dart';
import '../models/vendor_model.dart';
import '../widgets/vendor_status_badge.dart';

class VendorDetailPage extends StatefulWidget {
  final String vendorId;

  const VendorDetailPage({super.key, required this.vendorId});

  @override
  State<VendorDetailPage> createState() => _VendorDetailPageState();
}

class _VendorDetailPageState extends State<VendorDetailPage> {
  @override
  void initState() {
    super.initState();
    // Ensure vendors are loaded in case the user deep-linked directly here.
    context.read<VendorCubit>().ensureLoaded();
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<VendorCubit, VendorState>(
      builder: (context, state) {
        return switch (state) {
          VendorInitial() || VendorLoading() => Scaffold(
              backgroundColor: Colors.transparent,
              appBar: AppBar(title: const Text('Vendor Detail')),
              body: const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            ),
          VendorError(:final message) => Scaffold(
              backgroundColor: Colors.transparent,
              appBar: AppBar(title: const Text('Vendor Detail')),
              body: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline_rounded,
                        size: 64, color: AppColors.error),
                    const SizedBox(height: 16),
                    Text(message,
                        style: Theme.of(context)
                            .textTheme
                            .bodyMedium
                            ?.copyWith(color: AppColors.textSecondary),
                        textAlign: TextAlign.center),
                    const SizedBox(height: 24),
                    FilledButton.icon(
                      onPressed: () =>
                          context.read<VendorCubit>().load(),
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
          VendorLoaded() => _buildDetail(context, state),
        };
      },
    );
  }

  Widget _buildDetail(BuildContext context, VendorLoaded state) {
    final vendor = state.items.where((v) => v.id == widget.vendorId).firstOrNull;
    if (vendor == null) {
      return Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: const Text('Vendor Detail')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.store_outlined,
                  size: 64, color: AppColors.textSecondary),
              const SizedBox(height: 16),
              Text(
                'Vendor not found',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () => context.pop(),
                child: const Text('Back to Vendors'),
              ),
            ],
          ),
        ),
      );
    }

    final isActioning = state.actioningIds.contains(vendor.id);

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(title: Text(vendor.storeName)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Header ────────────────────────────────────────────────────────
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CircleAvatar(
                      radius: 32,
                      backgroundColor: AppColors.primary.withAlpha(20),
                      child: Text(
                        vendor.storeName.isNotEmpty
                            ? vendor.storeName[0].toUpperCase()
                            : '?',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 20),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            vendor.storeName,
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 6),
                          VendorStatusBadge(status: vendor.status),
                        ],
                      ),
                    ),
                    // Contextual action buttons
                    if (isActioning)
                      const Padding(
                        padding: EdgeInsets.all(8),
                        child: SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.primary,
                          ),
                        ),
                      )
                    else
                      _DetailActions(vendor: vendor),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // ── Two-column info cards ─────────────────────────────────────────
            Wrap(
              spacing: 16,
              runSpacing: 16,
              children: [
                _InfoCard(
                  title: 'Store Details',
                  children: [
                    _InfoRow(
                      label: 'Store Name',
                      value: vendor.storeName,
                    ),
                    _InfoRow(
                      label: 'Commission Rate',
                      value: vendor.commissionRate != null
                          ? '${(vendor.commissionRate! * 100).toStringAsFixed(1)}%'
                          : 'Platform default',
                    ),
                    _InfoRow(
                      label: 'Stripe Status',
                      value: vendor.stripeOnboardingStatus,
                    ),
                    _InfoRow(
                      label: 'Joined',
                      value: vendor.formattedJoinDate,
                    ),
                  ],
                ),
                _InfoCard(
                  title: 'Owner',
                  children: [
                    _InfoRow(label: 'Name', value: vendor.owner.name),
                    _InfoRow(label: 'Email', value: vendor.owner.email),
                    _InfoRow(
                      label: 'Account',
                      value: vendor.owner.isBanned ? 'Banned' : 'Active',
                      valueColor: vendor.owner.isBanned
                          ? AppColors.error
                          : AppColors.success,
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

}

// ── Detail action buttons ─────────────────────────────────────────────────────

class _DetailActions extends StatelessWidget {
  final VendorModel vendor;

  const _DetailActions({required this.vendor});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (vendor.status == 'PENDING' || vendor.status == 'REJECTED')
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.success,
              minimumSize: const Size(0, 36),
              padding: const EdgeInsets.symmetric(horizontal: 16),
            ),
            onPressed: () => _confirm(
              context,
              action: 'Approve',
              body:
                  '"${vendor.storeName}" will be approved and can start selling.',
              actionColor: AppColors.success,
              onConfirm: () =>
                  context.read<VendorCubit>().approveVendor(vendor),
            ),
            child: const Text('Approve'),
          ),
        if (vendor.status == 'PENDING') ...[
          const SizedBox(width: 8),
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.error,
              side: const BorderSide(color: AppColors.error),
              minimumSize: const Size(0, 36),
              padding: const EdgeInsets.symmetric(horizontal: 16),
            ),
            onPressed: () => _confirm(
              context,
              action: 'Reject',
              body:
                  '"${vendor.storeName}" will be rejected and cannot sell until re-approved.',
              actionColor: AppColors.error,
              onConfirm: () =>
                  context.read<VendorCubit>().rejectVendor(vendor),
            ),
            child: const Text('Reject'),
          ),
        ],
        if (vendor.status == 'APPROVED') ...[
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.warning,
              side: const BorderSide(color: AppColors.warning),
              minimumSize: const Size(0, 36),
              padding: const EdgeInsets.symmetric(horizontal: 16),
            ),
            onPressed: () => _confirm(
              context,
              action: 'Suspend',
              body:
                  '"${vendor.storeName}" will be suspended and lose access to selling.',
              actionColor: AppColors.warning,
              onConfirm: () =>
                  context.read<VendorCubit>().suspendVendor(vendor),
            ),
            child: const Text('Suspend'),
          ),
        ],
      ],
    );
  }

  Future<void> _confirm(
    BuildContext context, {
    required String action,
    required String body,
    required Color actionColor,
    required Future<String?> Function() onConfirm,
  }) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('$action "${vendor.storeName}"?'),
        content: Text(body),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: actionColor),
            child: Text(action),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      final error = await onConfirm();
      if (error != null && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }
}

// ── Reusable info card ────────────────────────────────────────────────────────

class _InfoCard extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _InfoCard({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(minWidth: 280, maxWidth: 400),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
              ),
              const SizedBox(height: 16),
              ...children,
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _InfoRow({required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 128,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w500,
                    color: valueColor ?? AppColors.textPrimary,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
