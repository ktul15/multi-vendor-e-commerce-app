import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/config/injection_container.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/vendor_profile.dart';
import '../../../shared/widgets/skeleton_box.dart';
import '../../../shared/widgets/error_state.dart';
import '../bloc/store_cubit.dart';
import '../bloc/store_state.dart';
import '../widgets/store_skeleton.dart';

class StorePage extends StatelessWidget {
  const StorePage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<StoreCubit>()..load(),
      child: const _StoreView(),
    );
  }
}

class _StoreView extends StatefulWidget {
  const _StoreView();

  @override
  State<_StoreView> createState() => _StoreViewState();
}

class _StoreViewState extends State<_StoreView> {
  final _formKey = GlobalKey<FormState>();
  final _storeNameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  bool _initialised = false;

  @override
  void dispose() {
    _storeNameCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  void _populate(VendorProfile profile) {
    if (!_initialised) {
      _storeNameCtrl.text = profile.storeName ?? '';
      _descCtrl.text = profile.description ?? '';
      _initialised = true;
    }
  }

  void _save(BuildContext context) {
    if (_formKey.currentState!.validate()) {
      context.read<StoreCubit>().save(
            storeName: _storeNameCtrl.text.trim(),
            description: _descCtrl.text.trim(),
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: BlocConsumer<StoreCubit, StoreState>(
        listener: (context, state) {
          if (state is StoreSaved) {
            _initialised = false;
            _populate(state.profile);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Store profile updated.'),
                backgroundColor: AppColors.success,
              ),
            );
            // StoreCubit transitions to StoreLoaded immediately after StoreSaved —
            // no redundant load() call needed here.
          }
          if (state is StoreError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is StoreLoading || state is StoreInitial) {
            return const SkeletonContainer(child: StoreSkeleton());
          }
          if (state is StoreError) {
            return ErrorState(
              message: state.message,
              onRetry: () => context.read<StoreCubit>().load(),
            );
          }

          final profile = switch (state) {
            StoreLoaded(:final profile) => profile,
            StoreSaved(:final profile) => profile,
            _ => null,
          };

          if (profile == null) return const SizedBox();
          _populate(profile);

          final isSaving = state is StoreLoaded && state.isSaving;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('My Store', style: AppTextStyles.h2),
                  const SizedBox(height: AppSpacing.sm),
                  _ApprovalBadge(status: profile.approvalStatus),
                  const SizedBox(height: AppSpacing.lg),
                  Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: AppColors.border),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Store Details', style: AppTextStyles.h3),
                            const SizedBox(height: AppSpacing.lg),
                            TextFormField(
                              controller: _storeNameCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Store Name',
                              ),
                              validator: (v) =>
                                  (v == null || v.trim().length < 2)
                                      ? 'Min 2 characters'
                                      : null,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            TextFormField(
                              controller: _descCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Description',
                                alignLabelWithHint: true,
                              ),
                              maxLines: 5,
                              maxLength: 1000,
                            ),
                            const SizedBox(height: AppSpacing.lg),
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton(
                                onPressed:
                                    isSaving ? null : () => _save(context),
                                child: isSaving
                                    ? const SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Text('Save Changes'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ApprovalBadge extends StatelessWidget {
  const _ApprovalBadge({required this.status});

  final String status;

  static const _data = <String, (Color, IconData)>{
    'APPROVED': (AppColors.success, Icons.verified_outlined),
    'PENDING': (AppColors.warning, Icons.hourglass_empty),
    'REJECTED': (AppColors.error, Icons.cancel_outlined),
  };

  @override
  Widget build(BuildContext context) {
    final (color, icon) = _data[status] ?? (AppColors.neutral500, Icons.info_outline);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 16),
        const SizedBox(width: 6),
        Text(
          'Vendor status: $status',
          style: TextStyle(color: color, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}
