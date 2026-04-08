import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/view/login_page.dart';
import '../../features/categories/bloc/category_cubit.dart';
import '../../features/categories/view/category_form_page.dart';
import '../../features/categories/view/category_list_page.dart';
import '../../features/dashboard/view/dashboard_page.dart';
import '../../features/vendors/bloc/vendor_cubit.dart';
import '../../features/vendors/view/vendor_detail_page.dart';
import '../../features/vendors/view/vendor_list_page.dart';
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
  static const String vendorDetail = ':id';        // relative — nested under /vendors
  static const String vendorDetailName = 'vendorDetail';
  static const String settingsName = 'settings';
}

final GoRouter appRouter = GoRouter(
  initialLocation: AppRoutes.dashboard,
  routes: [
    // Login is outside the admin shell (no sidebar).
    GoRoute(
      name: AppRoutes.loginName,
      path: AppRoutes.login,
      builder: (context, state) => const LoginPage(),
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
          builder: (context, state) => const DashboardPage(),
        ),

        // Categories — list + nested create/edit share one lazySingleton cubit.
        GoRoute(
          name: AppRoutes.categoriesName,
          path: AppRoutes.categories,
          builder: (context, state) => BlocProvider.value(
            // ensureLoaded skips the network call when data is already fresh
            // (e.g. navigating back after a mutation that ran _silentRefresh).
            value: sl<CategoryCubit>()..ensureLoaded(),
            child: const CategoryListPage(),
          ),
          routes: [
            GoRoute(
              name: AppRoutes.categoryCreateName,
              path: AppRoutes.categoryCreate,
              builder: (context, state) => BlocProvider.value(
                value: sl<CategoryCubit>(),
                child: const CategoryFormPage(),
              ),
            ),
            GoRoute(
              name: AppRoutes.categoryEditName,
              path: AppRoutes.categoryEdit,
              builder: (context, state) => BlocProvider.value(
                value: sl<CategoryCubit>(),
                child: CategoryFormPage(
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
              const _PlaceholderPage(title: 'Users'),
        ),
        GoRoute(
          name: AppRoutes.vendorsName,
          path: AppRoutes.vendors,
          builder: (context, state) => BlocProvider.value(
            value: sl<VendorCubit>()..ensureLoaded(),
            child: const VendorListPage(),
          ),
          routes: [
            GoRoute(
              name: AppRoutes.vendorDetailName,
              path: AppRoutes.vendorDetail,
              builder: (context, state) {
                final id = state.pathParameters['id']!;
                return BlocProvider.value(
                  value: sl<VendorCubit>(),
                  child: VendorDetailPage(vendorId: id),
                );
              },
            ),
          ],
        ),
        GoRoute(
          name: AppRoutes.settingsName,
          path: AppRoutes.settings,
          builder: (context, state) =>
              const _PlaceholderPage(title: 'Settings'),
        ),
      ],
    ),
  ],
);

class _PlaceholderPage extends StatelessWidget {
  final String title;

  const _PlaceholderPage({required this.title});

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
