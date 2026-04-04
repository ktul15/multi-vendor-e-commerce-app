import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../widgets/app_sidebar.dart';

/// Responsive shell that wraps all authenticated dashboard routes.
/// - Wide screens (≥ 900 px): permanent sidebar on the left.
/// - Narrow screens: sidebar in a Drawer accessible via the AppBar menu icon.
class ShellPage extends StatelessWidget {
  const ShellPage({super.key, required this.child});

  final Widget child;

  static const double _sidebarBreakpoint = 900;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= _sidebarBreakpoint;

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

        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            backgroundColor: AppColors.surface,
            elevation: 0,
            iconTheme: const IconThemeData(color: AppColors.textPrimary),
            title: const Text(
              'Vendor Hub',
              style: TextStyle(color: AppColors.textPrimary),
            ),
          ),
          drawer: const Drawer(child: AppSidebar()),
          body: child,
        );
      },
    );
  }
}
