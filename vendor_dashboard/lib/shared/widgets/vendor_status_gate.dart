import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/app_router.dart';
import '../../core/config/injection_container.dart';
import '../../core/network/error_messages.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_text_styles.dart';
import '../../features/auth/bloc/auth_bloc.dart';
import '../../features/auth/bloc/auth_event.dart';
import '../../repositories/vendor_profile_repository.dart';
import '../models/vendor_profile.dart';
import 'error_state.dart';
import 'skeleton_box.dart';

/// Blocks operational dashboard pages until the vendor profile is approved.
class VendorStatusGate extends StatefulWidget {
  const VendorStatusGate({super.key, required this.child});

  final Widget child;

  @override
  State<VendorStatusGate> createState() => _VendorStatusGateState();
}

class _VendorStatusGateState extends State<VendorStatusGate> {
  late Future<VendorProfile> _profileFuture;

  @override
  void initState() {
    super.initState();
    _profileFuture = sl<VendorProfileRepository>().getProfile();
  }

  void _retry() {
    setState(() {
      _profileFuture = sl<VendorProfileRepository>().getProfile();
    });
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<VendorProfile>(
      future: _profileFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const SkeletonContainer(
            child: Center(child: CircularProgressIndicator()),
          );
        }

        if (snapshot.hasError) {
          return ErrorState(
            message: userFacingErrorMessage(snapshot.error!),
            onRetry: _retry,
          );
        }

        final profile = snapshot.data!;
        if (profile.approvalStatus == 'APPROVED') {
          return widget.child;
        }

        return _VendorStatusView(profile: profile);
      },
    );
  }
}

class _VendorStatusView extends StatelessWidget {
  const _VendorStatusView({required this.profile});

  final VendorProfile profile;

  @override
  Widget build(BuildContext context) {
    final status = profile.approvalStatus;
    final data = _statusData(status);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.xxl),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: AppColors.border),
              ),
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Icon(data.icon, color: data.color, size: 48),
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      data.title,
                      style: AppTextStyles.h3,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      data.message,
                      style: AppTextStyles.body2.copyWith(
                        color: AppColors.textSecondary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    _StatusPill(status: status, color: data.color),
                    if (profile.storeName != null) ...[
                      const SizedBox(height: AppSpacing.md),
                      Text(
                        profile.storeName!,
                        style: AppTextStyles.h3,
                        textAlign: TextAlign.center,
                      ),
                    ],
                    const SizedBox(height: AppSpacing.xl),
                    FilledButton.icon(
                      onPressed: () => context.go(AppRoutes.store),
                      icon: const Icon(Icons.storefront_outlined),
                      label: const Text('View Store Profile'),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    TextButton.icon(
                      onPressed: () {
                        context.read<AuthBloc>().add(
                          const AuthLogoutRequested(),
                        );
                      },
                      icon: const Icon(Icons.logout),
                      label: const Text('Logout'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  _StatusData _statusData(String status) {
    return switch (status) {
      'PENDING' => const _StatusData(
        title: 'Application Under Review',
        message:
            'Your vendor account has been created. An admin must approve it before you can manage products, orders, and earnings.',
        color: AppColors.warning,
        icon: Icons.hourglass_empty,
      ),
      'REJECTED' => const _StatusData(
        title: 'Application Rejected',
        message:
            'Your vendor application was rejected. Review your store profile or contact the marketplace admin for next steps.',
        color: AppColors.error,
        icon: Icons.cancel_outlined,
      ),
      'SUSPENDED' => const _StatusData(
        title: 'Account Suspended',
        message:
            'Your vendor account is suspended. Product, order, and earnings tools are unavailable.',
        color: AppColors.error,
        icon: Icons.block_outlined,
      ),
      _ => const _StatusData(
        title: 'Vendor Status Required',
        message: 'Your account is not approved for vendor operations yet.',
        color: AppColors.neutral500,
        icon: Icons.info_outline,
      ),
    };
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.status, required this.color});

  final String status;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.center,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.xs,
        ),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          status,
          style: AppTextStyles.caption.copyWith(
            color: color,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _StatusData {
  final String title;
  final String message;
  final Color color;
  final IconData icon;

  const _StatusData({
    required this.title,
    required this.message,
    required this.color,
    required this.icon,
  });
}
