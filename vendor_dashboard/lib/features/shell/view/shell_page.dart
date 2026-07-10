import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../features/auth/bloc/auth_bloc.dart';
import '../../../features/auth/bloc/auth_event.dart';
import '../widgets/app_sidebar.dart';

/// Responsive shell that wraps all authenticated dashboard routes.
/// - Wide screens (≥ 900 px): permanent sidebar on the left.
/// - Narrow screens: bottom navigation with an app bar menu for account actions.
class ShellPage extends StatelessWidget {
  const ShellPage({super.key, required this.child});

  final Widget child;

  static const double _sidebarBreakpoint = 900;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= _sidebarBreakpoint;
        final location = GoRouterState.of(context).matchedLocation;

        if (isWide) {
          return Scaffold(
            backgroundColor: AppColors.background,
            body: Row(
              children: [
                const AppSidebar(),
                const VerticalDivider(width: 1, thickness: 1),
                Expanded(child: child),
              ],
            ),
          );
        }

        final currentIndex = appNavItems.indexWhere(
          (item) =>
              location == item.route ||
              (item.route == AppRoutes.dashboard && location == '/'),
        );

        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            backgroundColor: AppColors.surface,
            elevation: 0,
            title: const Text(
              'Vendor Hub',
              style: TextStyle(color: AppColors.textPrimary),
            ),
            actions: [
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert, color: AppColors.textPrimary),
                onSelected: (value) {
                  if (value == 'logout') {
                    context.read<AuthBloc>().add(AuthLogoutRequested());
                  }
                },
                itemBuilder: (context) => const [
                  PopupMenuItem<String>(value: 'logout', child: Text('Logout')),
                ],
              ),
            ],
          ),
          body: child,
          bottomNavigationBar: BottomNavigationBar(
            type: BottomNavigationBarType.fixed,
            currentIndex: currentIndex < 0 ? 0 : currentIndex,
            onTap: (index) => context.go(appNavItems[index].route),
            items: appNavItems
                .map(
                  (item) => BottomNavigationBarItem(
                    icon: Icon(item.icon),
                    activeIcon: Icon(item.activeIcon),
                    label: item.label,
                  ),
                )
                .toList(),
          ),
        );
      },
    );
  }
}
