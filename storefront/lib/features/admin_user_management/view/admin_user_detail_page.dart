import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../models/admin_user_model.dart';
import '../widgets/user_role_color.dart';

final _dateFormat = DateFormat('MMM d, yyyy');

class AdminUserDetailPage extends StatelessWidget {
  final AdminUserModel user;

  const AdminUserDetailPage({super.key, required this.user});

  static Color _vendorStatusColor(String status) {
    return switch (status) {
      'APPROVED' => AppColors.success,
      'PENDING' => AppColors.warning,
      'SUSPENDED' => AppColors.error,
      _ => AppColors.textSecondary,
    };
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 1,
        title: const Text('User Detail'),
        titleTextStyle: AppTextStyles.h5.copyWith(color: AppColors.textPrimary),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.base),
        children: [
          _UserHeader(user: user),
          const SizedBox(height: AppSpacing.base),
          _DetailSection(
            title: 'Account',
            rows: [
              _DetailRow(label: 'Role', value: user.role),
              _DetailRow(
                label: 'Member Since',
                value: _dateFormat.format(user.createdAt),
              ),
              _DetailRow(
                label: 'Email Verified',
                value: user.isVerified ? 'Yes' : 'No',
                valueColor: user.isVerified ? AppColors.success : AppColors.warning,
              ),
              _DetailRow(
                label: 'Account Status',
                value: user.isBanned ? 'Banned' : 'Active',
                valueColor: user.isBanned ? AppColors.error : AppColors.success,
              ),
            ],
          ),
          if (user.vendorProfile != null) ...[
            const SizedBox(height: AppSpacing.base),
            _DetailSection(
              title: 'Vendor Info',
              rows: [
                _DetailRow(
                  label: 'Store Name',
                  value: user.vendorProfile!.storeName,
                ),
                _DetailRow(
                  label: 'Status',
                  value: user.vendorProfile!.status,
                  valueColor: _vendorStatusColor(user.vendorProfile!.status),
                ),
              ],
            ),
          ],
          const SizedBox(height: AppSpacing.xl),
        ],
      ),
    );
  }
}

// ── User header ───────────────────────────────────────────────────────────────

class _UserHeader extends StatelessWidget {
  final AdminUserModel user;

  const _UserHeader({required this.user});

  @override
  Widget build(BuildContext context) {
    final color = roleColor(user.role);
    final initial = user.name.isNotEmpty ? user.name[0].toUpperCase() : '?';

    return Card(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          children: [
            CircleAvatar(
              radius: 36,
              backgroundColor: color.withAlpha(30),
              child: Text(
                initial,
                style: AppTextStyles.h2.copyWith(
                  color: color,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.base),
            Text(
              user.name,
              style: AppTextStyles.h4,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              user.email,
              style:
                  AppTextStyles.body.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.base),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.xs,
              alignment: WrapAlignment.center,
              children: [
                _StatusChip(label: user.role, color: color),
                if (user.isVerified)
                  const _StatusChip(
                    label: 'Verified',
                    color: AppColors.success,
                  ),
                if (user.isBanned)
                  const _StatusChip(
                    label: 'Banned',
                    color: AppColors.error,
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String label;
  final Color color;

  const _StatusChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: BorderRadius.circular(AppRadius.full),
        border: Border.all(color: color.withAlpha(60)),
      ),
      child: Text(
        label,
        style: AppTextStyles.caption.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ── Detail section ────────────────────────────────────────────────────────────

class _DetailSection extends StatelessWidget {
  final String title;
  // List<Widget> keeps the signature open to any widget type in the future.
  final List<Widget> rows;

  const _DetailSection({required this.title, required this.rows});

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
            ...rows.map(
              (row) => Column(
                children: [
                  const SizedBox(height: AppSpacing.sm),
                  row,
                ],
              ),
            ),
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

  const _DetailRow({
    required this.label,
    required this.value,
    this.valueColor,
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
            fontWeight: FontWeight.w500,
            color: valueColor ?? AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}
