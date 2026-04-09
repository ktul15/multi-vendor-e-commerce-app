import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/app_router.dart';
import '../../core/theme/app_colors.dart';

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
    return 0; // dashboard
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          NavigationRail(
            selectedIndex: _selectedIndex,
            onDestinationSelected: (index) =>
                _onNavTap(context, index),
            labelType: NavigationRailLabelType.all,
            backgroundColor: AppColors.surface,
            leading: Padding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Column(
                children: [
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
                ],
              ),
            ),
            destinations: const [
              NavigationRailDestination(
                icon: Icon(Icons.dashboard_outlined),
                selectedIcon: Icon(Icons.dashboard_rounded),
                label: Text('Dashboard'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.category_outlined),
                selectedIcon: Icon(Icons.category_rounded),
                label: Text('Categories'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.people_outline_rounded),
                selectedIcon: Icon(Icons.people_rounded),
                label: Text('Users'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.store_outlined),
                selectedIcon: Icon(Icons.store_rounded),
                label: Text('Vendors'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.inventory_2_outlined),
                selectedIcon: Icon(Icons.inventory_2_rounded),
                label: Text('Products'),
              ),
            ],
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
    }
  }
}
