import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/categories/presentation/category_cubit.dart';
import '../../features/categories/presentation/category_form_screen.dart';
import '../../features/categories/presentation/category_list_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../shared/widgets/admin_shell.dart';
import 'injection_container.dart';

class AppRoutes {
  AppRoutes._();

  // ── Paths ──────────────────────────────────────────────────────────────────
  static const String dashboard = '/';
  static const String login = '/login';
  static const String categories = '/categories';
  static const String categoryCreate = 'create';     // relative — nested under /categories
  static const String categoryEdit = ':id/edit';     // relative — nested under /categories
  static const String users = '/users';
  static const String vendors = '/vendors';
  static const String settings = '/settings';

  // ── Named route constants ──────────────────────────────────────────────────
  static const String dashboardName = 'dashboard';
  static const String loginName = 'login';
  static const String categoriesName = 'categories';
  static const String categoryCreateName = 'categoryCreate';
  static const String categoryEditName = 'categoryEdit';
  static const String usersName = 'users';
  static const String vendorsName = 'vendors';
  static const String settingsName = 'settings';
}

final GoRouter appRouter = GoRouter(
  initialLocation: AppRoutes.dashboard,
  routes: [
    // Login is outside the admin shell (no sidebar).
    GoRoute(
      name: AppRoutes.loginName,
      path: AppRoutes.login,
      builder: (context, state) => const LoginScreen(),
    ),

    // All admin screens share the persistent AdminShell sidebar.
    ShellRoute(
      builder: (context, state, child) => AdminShell(
        currentLocation: state.matchedLocation,
        child: child,
      ),
      routes: [
        GoRoute(
          name: AppRoutes.dashboardName,
          path: AppRoutes.dashboard,
          builder: (context, state) => const DashboardScreen(),
        ),

        // Categories — list + nested create/edit share one lazySingleton cubit.
        GoRoute(
          name: AppRoutes.categoriesName,
          path: AppRoutes.categories,
          builder: (context, state) => BlocProvider.value(
            // ensureLoaded skips the network call when data is already fresh
            // (e.g. navigating back after a mutation that ran _silentRefresh).
            value: sl<CategoryCubit>()..ensureLoaded(),
            child: const CategoryListScreen(),
          ),
          routes: [
            GoRoute(
              name: AppRoutes.categoryCreateName,
              path: AppRoutes.categoryCreate,
              builder: (context, state) => BlocProvider.value(
                value: sl<CategoryCubit>(),
                child: const CategoryFormScreen(),
              ),
            ),
            GoRoute(
              name: AppRoutes.categoryEditName,
              path: AppRoutes.categoryEdit,
              builder: (context, state) => BlocProvider.value(
                value: sl<CategoryCubit>(),
                child: CategoryFormScreen(
                  categoryId: state.pathParameters['id'],
                ),
              ),
            ),
          ],
        ),

        // Placeholder routes — screens to be built in future issues.
        GoRoute(
          name: AppRoutes.usersName,
          path: AppRoutes.users,
          builder: (context, state) =>
              const _PlaceholderScreen(title: 'Users'),
        ),
        GoRoute(
          name: AppRoutes.vendorsName,
          path: AppRoutes.vendors,
          builder: (context, state) =>
              const _PlaceholderScreen(title: 'Vendors'),
        ),
        GoRoute(
          name: AppRoutes.settingsName,
          path: AppRoutes.settings,
          builder: (context, state) =>
              const _PlaceholderScreen(title: 'Settings'),
        ),
      ],
    ),
  ],
);

class _PlaceholderScreen extends StatelessWidget {
  final String title;

  const _PlaceholderScreen({required this.title});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Text(
          '$title — coming soon',
          style: Theme.of(context).textTheme.titleMedium,
        ),
      ),
    );
  }
}
