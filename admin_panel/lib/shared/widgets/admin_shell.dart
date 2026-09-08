import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/app_router.dart';
import '../../core/theme/app_colors.dart';
import '../../features/auth/bloc/auth_cubit.dart';

/// Persistent admin shell with a [NavigationRail] sidebar.
/// Wraps all authenticated admin screens via GoRouter's [ShellRoute].
class AdminShell extends StatelessWidget {
  final String currentLocation;
  final Widget child;

  const AdminShell({
    super.key,
    required this.currentLocation,
    required this.child,
  });

  int get _selectedIndex {
    if (currentLocation.startsWith(AppRoutes.categories)) return 1;
    if (currentLocation.startsWith(AppRoutes.users)) return 2;
    if (currentLocation.startsWith(AppRoutes.vendors)) return 3;
    if (currentLocation.startsWith(AppRoutes.products)) return 4;
    if (currentLocation.startsWith(AppRoutes.orders)) return 5;
    if (currentLocation.startsWith(AppRoutes.finance)) return 6;
    if (currentLocation.startsWith(AppRoutes.banners)) return 7;
    if (currentLocation.startsWith(AppRoutes.promos)) return 8;
    return 0; // dashboard
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          _AdminSidebar(
            selectedIndex: _selectedIndex,
            onDestinationSelected: (index) => _onNavTap(context, index),
            onLogout: () => context.read<AuthCubit>().logout(),
          ),
          const VerticalDivider(thickness: 1, width: 1),
          Expanded(child: child),
        ],
      ),
    );
  }

  void _onNavTap(BuildContext context, int index) {
    switch (index) {
      case 0:
        context.goNamed(AppRoutes.dashboardName);
      case 1:
        context.goNamed(AppRoutes.categoriesName);
      case 2:
        context.goNamed(AppRoutes.usersName);
      case 3:
        context.goNamed(AppRoutes.vendorsName);
      case 4:
        context.goNamed(AppRoutes.productsName);
      case 5:
        context.goNamed(AppRoutes.ordersName);
      case 6:
        context.goNamed(AppRoutes.financeName);
      case 7:
        context.goNamed(AppRoutes.bannersName);
      case 8:
        context.goNamed(AppRoutes.promosName);
    }
  }
}

class _AdminSidebar extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;
  final VoidCallback onLogout;

  const _AdminSidebar({
    required this.selectedIndex,
    required this.onDestinationSelected,
    required this.onLogout,
  });

  static const _items = [
    _SidebarDestination(
      label: 'Dashboard',
      icon: Icons.dashboard_outlined,
      selectedIcon: Icons.dashboard_rounded,
    ),
    _SidebarDestination(
      label: 'Categories',
      icon: Icons.category_outlined,
      selectedIcon: Icons.category_rounded,
    ),
    _SidebarDestination(
      label: 'Users',
      icon: Icons.people_outline_rounded,
      selectedIcon: Icons.people_rounded,
    ),
    _SidebarDestination(
      label: 'Vendors',
      icon: Icons.store_outlined,
      selectedIcon: Icons.store_rounded,
    ),
    _SidebarDestination(
      label: 'Products',
      icon: Icons.inventory_2_outlined,
      selectedIcon: Icons.inventory_2_rounded,
    ),
    _SidebarDestination(
      label: 'Orders',
      icon: Icons.receipt_long_outlined,
      selectedIcon: Icons.receipt_long_rounded,
    ),
    _SidebarDestination(
      label: 'Finance',
      icon: Icons.bar_chart_outlined,
      selectedIcon: Icons.bar_chart_rounded,
    ),
    _SidebarDestination(
      label: 'Banners',
      icon: Icons.image_outlined,
      selectedIcon: Icons.image_rounded,
    ),
    _SidebarDestination(
      label: 'Promos',
      icon: Icons.discount_outlined,
      selectedIcon: Icons.discount_rounded,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 88,
      child: ColoredBox(
        color: AppColors.surface,
        child: SafeArea(
          child: Column(
            children: [
              const SizedBox(height: 20),
              Icon(
                Icons.admin_panel_settings_rounded,
                color: AppColors.primary,
                size: 32,
              ),
              const SizedBox(height: 4),
              Text(
                'Admin',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 18),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Column(
                    children: [
                      for (var i = 0; i < _items.length; i++)
                        _SidebarItem(
                          destination: _items[i],
                          selected: i == selectedIndex,
                          onTap: () => onDestinationSelected(i),
                        ),
                    ],
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Logout',
                icon: const Icon(Icons.logout_rounded),
                color: AppColors.textSecondary,
                onPressed: onLogout,
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }
}

class _SidebarItem extends StatelessWidget {
  final _SidebarDestination destination;
  final bool selected;
  final VoidCallback onTap;

  const _SidebarItem({
    required this.destination,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppColors.primary : AppColors.textPrimary;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      child: Tooltip(
        message: destination.label,
        waitDuration: const Duration(milliseconds: 500),
        child: Material(
          color: selected
              ? AppColors.primary.withValues(alpha: 0.12)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(24),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(24),
            child: SizedBox(
              height: 64,
              width: 72,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    selected ? destination.selectedIcon : destination.icon,
                    size: 26,
                    color: color,
                  ),
                  const SizedBox(height: 5),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    child: Text(
                      destination.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: color,
                        fontWeight: selected
                            ? FontWeight.w700
                            : FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SidebarDestination {
  final String label;
  final IconData icon;
  final IconData selectedIcon;

  const _SidebarDestination({
    required this.label,
    required this.icon,
    required this.selectedIcon,
  });
}
