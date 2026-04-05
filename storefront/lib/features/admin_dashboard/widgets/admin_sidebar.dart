import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

class AdminSidebar extends StatelessWidget {
  const AdminSidebar({super.key});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: AppColors.surface,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
              child: Text(
                'Admin Panel',
                style: AppTextStyles.h5.copyWith(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const Divider(height: 1, color: AppColors.divider),
            const SizedBox(height: 8),
            _NavItem(
              icon: Icons.dashboard_rounded,
              label: 'Overview',
              isActive: true,
              onTap: () => Navigator.of(context).pop(),
            ),
            _NavItem(
              icon: Icons.people_outline_rounded,
              label: 'Users',
              isActive: false,
              onTap: () => _showComingSoon(context, 'Users'),
            ),
            _NavItem(
              icon: Icons.storefront_outlined,
              label: 'Vendors',
              isActive: false,
              onTap: () => _showComingSoon(context, 'Vendors'),
            ),
            _NavItem(
              icon: Icons.receipt_long_outlined,
              label: 'Orders',
              isActive: false,
              onTap: () => _showComingSoon(context, 'Orders'),
            ),
          ],
        ),
      ),
    );
  }

  void _showComingSoon(BuildContext context, String section) {
    // Resolve ScaffoldMessenger before popping — the Drawer's context is
    // deactivated after pop() and can no longer look up its ancestors.
    final messenger = ScaffoldMessenger.of(context);
    Navigator.of(context).pop();
    messenger.showSnackBar(
      SnackBar(
        content: Text('$section management — coming soon'),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(
        icon,
        color: isActive ? AppColors.primary : AppColors.textSecondary,
        size: 22,
      ),
      title: Text(
        label,
        style: AppTextStyles.body.copyWith(
          color: isActive ? AppColors.primary : AppColors.textPrimary,
          fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
        ),
      ),
      tileColor: isActive ? AppColors.primary.withAlpha(13) : null,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      onTap: onTap,
    );
  }
}
