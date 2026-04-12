import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../features/auth/bloc/auth_bloc.dart';
import '../../../features/auth/bloc/auth_event.dart';

class AppSidebar extends StatelessWidget {
  const AppSidebar({super.key});

  static const _navItems = [
    _NavItem(
      label: 'Dashboard',
      icon: Icons.dashboard_outlined,
      activeIcon: Icons.dashboard,
      route: AppRoutes.dashboard,
    ),
    _NavItem(
      label: 'Products',
      icon: Icons.inventory_2_outlined,
      activeIcon: Icons.inventory_2,
      route: AppRoutes.products,
    ),
    _NavItem(
      label: 'Orders',
      icon: Icons.receipt_long_outlined,
      activeIcon: Icons.receipt_long,
      route: AppRoutes.orders,
    ),
    _NavItem(
      label: 'Earnings',
      icon: Icons.bar_chart_outlined,
      activeIcon: Icons.bar_chart,
      route: AppRoutes.earnings,
    ),
    _NavItem(
      label: 'My Store',
      icon: Icons.storefront_outlined,
      activeIcon: Icons.storefront,
      route: AppRoutes.store,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;

    return Container(
      width: 220,
      color: AppColors.surface,
      child: Column(
        children: [
          _SidebarHeader(),
          const Divider(height: 1),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: _navItems
                  .map(
                    (item) => _SidebarTile(
                      item: item,
                      isActive: location == item.route ||
                          (item.route == AppRoutes.dashboard &&
                              location == '/'),
                      onTap: () => context.go(item.route),
                    ),
                  )
                  .toList(),
            ),
          ),
          const Divider(height: 1),
          _LogoutTile(),
        ],
      ),
    );
  }
}

class _SidebarHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      alignment: Alignment.centerLeft,
      child: Row(
        children: [
          const Icon(Icons.storefront, color: AppColors.primary, size: 28),
          const SizedBox(width: 10),
          Text(
            'Vendor Hub',
            style: AppTextStyles.h3.copyWith(color: AppColors.primary),
          ),
        ],
      ),
    );
  }
}

class _SidebarTile extends StatelessWidget {
  const _SidebarTile({
    required this.item,
    required this.isActive,
    required this.onTap,
  });

  final _NavItem item;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: isActive
            ? AppColors.primary.withValues(alpha: 0.12)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
      ),
      child: ListTile(
        leading: Icon(
          isActive ? item.activeIcon : item.icon,
          color: isActive ? AppColors.primary : AppColors.textSecondary,
          size: 22,
        ),
        title: Text(
          item.label,
          style: AppTextStyles.body2.copyWith(
            color: isActive ? AppColors.primary : AppColors.textPrimary,
            fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
        dense: true,
        onTap: onTap,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}

class _LogoutTile extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: const Icon(
        Icons.logout,
        color: AppColors.error,
        size: 22,
      ),
      title: Text(
        'Logout',
        style: AppTextStyles.body2.copyWith(color: AppColors.error),
      ),
      dense: true,
      onTap: () {
        context.read<AuthBloc>().add(AuthLogoutRequested());
      },
    );
  }
}

class _NavItem {
  final String label;
  final IconData icon;
  final IconData activeIcon;
  final String route;

  const _NavItem({
    required this.label,
    required this.icon,
    required this.activeIcon,
    required this.route,
  });
}
