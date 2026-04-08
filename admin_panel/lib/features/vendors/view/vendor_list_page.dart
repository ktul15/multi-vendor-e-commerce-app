import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../bloc/vendor_cubit.dart';
import '../bloc/vendor_state.dart';
import '../models/vendor_model.dart';
import '../widgets/vendor_status_badge.dart';

class VendorListPage extends StatefulWidget {
  const VendorListPage({super.key});

  @override
  State<VendorListPage> createState() => _VendorListPageState();
}

class _VendorListPageState extends State<VendorListPage> {
  final _searchController = TextEditingController();
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      if (!mounted) return;
      _doWithSnackbar(() => context.read<VendorCubit>().search(value));
    });
  }

  Future<void> _doWithSnackbar(Future<String?> Function() action) async {
    final error = await action();
    if (error != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(title: const Text('Vendors')),
      body: BlocBuilder<VendorCubit, VendorState>(
        builder: (context, state) {
          return switch (state) {
            VendorInitial() || VendorLoading() => const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            VendorError(:final message) => _ErrorView(message: message),
            VendorLoaded() => _LoadedBody(
                state: state,
                searchController: _searchController,
                onSearchChanged: _onSearchChanged,
                onDoWithSnackbar: _doWithSnackbar,
              ),
          };
        },
      ),
    );
  }
}

// ── Loaded body ───────────────────────────────────────────────────────────────

class _LoadedBody extends StatelessWidget {
  final VendorLoaded state;
  final TextEditingController searchController;
  final ValueChanged<String> onSearchChanged;
  final Future<void> Function(Future<String?> Function()) onDoWithSnackbar;

  const _LoadedBody({
    required this.state,
    required this.searchController,
    required this.onSearchChanged,
    required this.onDoWithSnackbar,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () => context.read<VendorCubit>().refresh(),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _Toolbar(
                  searchController: searchController,
                  onSearchChanged: onSearchChanged,
                ),
                const SizedBox(height: 12),
                _StatusFilterBar(
                  statusFilter: state.statusFilter,
                  onFilterChanged: (status) => onDoWithSnackbar(
                    () => context.read<VendorCubit>().filterByStatus(status),
                  ),
                ),
                const SizedBox(height: 16),
                _VendorTable(
                  state: state,
                  onDoWithSnackbar: onDoWithSnackbar,
                ),
                const SizedBox(height: 12),
                _PaginationBar(
                  state: state,
                  onDoWithSnackbar: onDoWithSnackbar,
                ),
              ],
            ),
          ),
        ),
        // Translucent overlay while a page/filter/search fetch is in flight.
        if (state.isRefreshing)
          const Positioned.fill(
            child: ColoredBox(
              color: Color(0x33FFFFFF),
              child: Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            ),
          ),
      ],
    );
  }
}

// ── Toolbar (search) ──────────────────────────────────────────────────────────

class _Toolbar extends StatelessWidget {
  final TextEditingController searchController;
  final ValueChanged<String> onSearchChanged;

  const _Toolbar({
    required this.searchController,
    required this.onSearchChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 320,
      child: TextField(
        controller: searchController,
        onChanged: onSearchChanged,
        decoration: InputDecoration(
          hintText: 'Search by store name…',
          prefixIcon: const Icon(
            Icons.search_rounded,
            size: 20,
            color: AppColors.textSecondary,
          ),
          suffixIcon: searchController.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear_rounded, size: 18),
                  onPressed: () {
                    searchController.clear();
                    onSearchChanged('');
                  },
                )
              : null,
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 10,
          ),
        ),
      ),
    );
  }
}

// ── Status filter chips ───────────────────────────────────────────────────────

class _StatusFilterBar extends StatelessWidget {
  final String? statusFilter;
  final Future<void> Function(String?) onFilterChanged;

  const _StatusFilterBar({
    required this.statusFilter,
    required this.onFilterChanged,
  });

  @override
  Widget build(BuildContext context) {
    const statuses = [null, 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];
    return Wrap(
      spacing: 8,
      children: [
        for (final s in statuses)
          FilterChip(
            label: Text(s ?? 'All'),
            selected: statusFilter == s,
            onSelected: (_) => onFilterChanged(s),
            showCheckmark: false,
            selectedColor: AppColors.primary,
            labelStyle: TextStyle(
              color: statusFilter == s ? Colors.white : AppColors.textPrimary,
              fontSize: 13,
              fontWeight: statusFilter == s ? FontWeight.w600 : FontWeight.w400,
            ),
            side: BorderSide(
              color:
                  statusFilter == s ? AppColors.primary : AppColors.border,
            ),
            backgroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 4),
          ),
      ],
    );
  }
}

// ── Vendor DataTable ──────────────────────────────────────────────────────────

class _VendorTable extends StatelessWidget {
  final VendorLoaded state;
  final Future<void> Function(Future<String?> Function()) onDoWithSnackbar;

  const _VendorTable({
    required this.state,
    required this.onDoWithSnackbar,
  });

  @override
  Widget build(BuildContext context) {
    if (state.items.isEmpty && !state.isRefreshing) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 64),
          child: Center(
            child: Column(
              children: [
                Icon(
                  Icons.store_outlined,
                  size: 64,
                  color: AppColors.textSecondary.withAlpha(100),
                ),
                const SizedBox(height: 16),
                Text(
                  'No vendors found',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Card(
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columnSpacing: 28,
          headingRowColor: WidgetStateProperty.all(AppColors.background),
          columns: const [
            DataColumn(label: Text('Store')),
            DataColumn(label: Text('Owner')),
            DataColumn(label: Text('Status')),
            DataColumn(label: Text('Commission')),
            DataColumn(label: Text('Joined')),
            DataColumn(label: Text('Actions')),
          ],
          rows: state.items.map((vendor) {
            final isActioning = state.actioningIds.contains(vendor.id);
            return DataRow(
              cells: [
                // Store name — tappable to open detail
                DataCell(
                  InkWell(
                    onTap: () => context.goNamed(
                      AppRoutes.vendorDetailName,
                      pathParameters: {'id': vendor.id},
                    ),
                    child: Text(
                      vendor.storeName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                        decoration: TextDecoration.underline,
                        decorationColor: AppColors.primary,
                      ),
                    ),
                  ),
                ),
                // Owner
                DataCell(
                  Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        vendor.owner.name,
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                      Text(
                        vendor.owner.email,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                // Status badge
                DataCell(VendorStatusBadge(status: vendor.status)),
                // Commission
                DataCell(
                  Text(
                    vendor.commissionRate != null
                        ? '${(vendor.commissionRate! * 100).toStringAsFixed(1)}%'
                        : 'Platform default',
                    style: TextStyle(
                      color: vendor.commissionRate != null
                          ? AppColors.textPrimary
                          : AppColors.textSecondary,
                      fontSize: 13,
                    ),
                  ),
                ),
                // Joined date
                DataCell(
                  Text(
                    vendor.formattedJoinDate,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
                // Action buttons
                DataCell(
                  isActioning
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.primary,
                          ),
                        )
                      : _ActionButtons(
                          vendor: vendor,
                          onDoWithSnackbar: onDoWithSnackbar,
                        ),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }

}

// ── Per-row action buttons ────────────────────────────────────────────────────

class _ActionButtons extends StatelessWidget {
  final VendorModel vendor;
  final Future<void> Function(Future<String?> Function()) onDoWithSnackbar;

  const _ActionButtons({
    required this.vendor,
    required this.onDoWithSnackbar,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (vendor.status == 'PENDING' || vendor.status == 'REJECTED')
          _ActionButton(
            label: 'Approve',
            color: AppColors.success,
            onTap: () => _confirm(
              context,
              action: 'Approve',
              body:
                  '"${vendor.storeName}" will be approved and can start selling.',
              actionColor: AppColors.success,
              onConfirm: () => onDoWithSnackbar(
                () => context.read<VendorCubit>().approveVendor(vendor),
              ),
            ),
          ),
        if (vendor.status == 'PENDING') ...[
          const SizedBox(width: 8),
          _ActionButton(
            label: 'Reject',
            color: AppColors.error,
            onTap: () => _confirm(
              context,
              action: 'Reject',
              body:
                  '"${vendor.storeName}" will be rejected and cannot sell until re-approved.',
              actionColor: AppColors.error,
              onConfirm: () => onDoWithSnackbar(
                () => context.read<VendorCubit>().rejectVendor(vendor),
              ),
            ),
          ),
        ],
        if (vendor.status == 'APPROVED') ...[
          _ActionButton(
            label: 'Suspend',
            color: AppColors.warning,
            onTap: () => _confirm(
              context,
              action: 'Suspend',
              body:
                  '"${vendor.storeName}" will be suspended and lose access to selling.',
              actionColor: AppColors.warning,
              onConfirm: () => onDoWithSnackbar(
                () => context.read<VendorCubit>().suspendVendor(vendor),
              ),
            ),
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
    required Future<void> Function() onConfirm,
  }) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => _ConfirmDialog(
        vendorName: vendor.storeName,
        action: action,
        body: body,
        actionColor: actionColor,
      ),
    );
    if (confirmed == true && context.mounted) {
      await onConfirm();
    }
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        foregroundColor: color,
        side: BorderSide(color: color.withAlpha(120)),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
        minimumSize: const Size(0, 32),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        textStyle:
            const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
      ),
      child: Text(label),
    );
  }
}

// ── Pagination bar ────────────────────────────────────────────────────────────

class _PaginationBar extends StatelessWidget {
  final VendorLoaded state;
  final Future<void> Function(Future<String?> Function()) onDoWithSnackbar;

  const _PaginationBar({
    required this.state,
    required this.onDoWithSnackbar,
  });

  @override
  Widget build(BuildContext context) {
    if (state.total == 0) return const SizedBox.shrink();

    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        Text(
          'Showing ${state.fromItem}–${state.toItem} of ${state.total}',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.textSecondary,
              ),
        ),
        const SizedBox(width: 16),
        IconButton(
          tooltip: 'Previous page',
          icon: const Icon(Icons.chevron_left_rounded),
          onPressed: state.hasPrevPage && !state.isRefreshing
              ? () => onDoWithSnackbar(
                    () => context.read<VendorCubit>().prevPage(),
                  )
              : null,
        ),
        Text(
          'Page ${state.page} of ${state.totalPages}',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        IconButton(
          tooltip: 'Next page',
          icon: const Icon(Icons.chevron_right_rounded),
          onPressed: state.hasNextPage && !state.isRefreshing
              ? () => onDoWithSnackbar(
                    () => context.read<VendorCubit>().nextPage(),
                  )
              : null,
        ),
      ],
    );
  }
}

// ── Confirmation dialog ───────────────────────────────────────────────────────

class _ConfirmDialog extends StatelessWidget {
  final String vendorName;
  final String action;
  final String body;
  final Color actionColor;

  const _ConfirmDialog({
    required this.vendorName,
    required this.action,
    required this.body,
    required this.actionColor,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('$action "$vendorName"?'),
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
    );
  }
}

// ── Error view ────────────────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  final String message;

  const _ErrorView({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline_rounded, size: 72, color: AppColors.error),
          const SizedBox(height: 16),
          Text(
            'Failed to load vendors',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            message,
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(color: AppColors.textSecondary),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () => context.read<VendorCubit>().load(),
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}
