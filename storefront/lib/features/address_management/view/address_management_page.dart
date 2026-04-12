import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/config/injection_container.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/address_model.dart';
import '../bloc/address_management_cubit.dart';
import '../bloc/address_management_state.dart';
import '../widgets/address_card.dart';
import '../widgets/address_form_sheet.dart';

class AddressManagementPage extends StatelessWidget {
  const AddressManagementPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<AddressManagementCubit>()..loadAddresses(),
      child: const _AddressManagementView(),
    );
  }
}

class _AddressManagementView extends StatelessWidget {
  const _AddressManagementView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Addresses'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Add address',
            onPressed: () => _openForm(context),
          ),
        ],
      ),
      body: BlocBuilder<AddressManagementCubit, AddressManagementState>(
        builder: (context, state) {
          return switch (state) {
            AddressManagementLoading() => const Center(
                child: CircularProgressIndicator(),
              ),
            AddressManagementError(:final message) => _ErrorBody(
                message: message,
                onRetry: () =>
                    context.read<AddressManagementCubit>().loadAddresses(),
              ),
            AddressManagementLoaded() => _LoadedBody(state: state),
          };
        },
      ),
    );
  }

  void _openForm(BuildContext context, {AddressModel? initial}) =>
      _openAddressFormSheet(context, initial: initial);
}

// ── Shared helpers ────────────────────────────────────────────────────────────

void _openAddressFormSheet(BuildContext context, {AddressModel? initial}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
    ),
    builder: (_) => BlocProvider.value(
      value: context.read<AddressManagementCubit>(),
      child: AddressFormSheet(initial: initial),
    ),
  );
}

// ── Loaded body ───────────────────────────────────────────────────────────────

class _LoadedBody extends StatelessWidget {
  final AddressManagementLoaded state;

  const _LoadedBody({required this.state});

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        // Mutation error banner
        if (state.error != null)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.base,
                AppSpacing.base,
                AppSpacing.base,
                0,
              ),
              child: Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.error.withAlpha(25),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  state.error!,
                  style:
                      AppTextStyles.caption.copyWith(color: AppColors.error),
                ),
              ),
            ),
          ),

        if (state.addresses.isEmpty)
          const SliverFillRemaining(
            child: _EmptyState(),
          )
        else
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (ctx, i) {
                final addr = state.addresses[i];
                return AddressCard(
                  address: addr,
                  isBusy: state.isBusy,
                  onSetDefault: addr.isDefault
                      ? null
                      : () => ctx
                          .read<AddressManagementCubit>()
                          .setDefault(addr.id),
                  onEdit: () => _openAddressFormSheet(ctx, initial: addr),
                  onDelete: () => _confirmDelete(ctx, addr),
                );
              },
              childCount: state.addresses.length,
            ),
          ),

        const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xl)),
      ],
    );
  }

  void _confirmDelete(BuildContext context, AddressModel address) {
    showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Delete Address'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Remove "${address.fullName}" at ${address.singleLine}?'),
            if (address.isDefault) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                'This is your default address. You will need to set a new default before checking out.',
                style: AppTextStyles.caption.copyWith(color: AppColors.error),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    ).then((confirmed) {
      if (confirmed == true && context.mounted) {
        context.read<AddressManagementCubit>().deleteAddress(address.id);
      }
    });
  }
}

// ── Sub-widgets ───────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.location_off_outlined,
              size: 64,
              color: AppColors.textSecondary.withAlpha(128),
            ),
            const SizedBox(height: AppSpacing.base),
            Text(
              'No saved addresses',
              style: AppTextStyles.h5.copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Tap + to add one.',
              style:
                  AppTextStyles.body.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorBody extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorBody({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: AppColors.error),
            const SizedBox(height: AppSpacing.base),
            Text('Something went wrong', style: AppTextStyles.h5),
            const SizedBox(height: AppSpacing.sm),
            Text(
              message,
              style:
                  AppTextStyles.body.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xl),
            ElevatedButton(
              onPressed: onRetry,
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
