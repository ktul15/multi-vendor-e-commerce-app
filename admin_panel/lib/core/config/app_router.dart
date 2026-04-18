import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/bloc/auth_cubit.dart';
import '../../features/auth/bloc/auth_state.dart';
import '../../features/auth/view/login_page.dart';
import '../../features/banners/bloc/banner_cubit.dart';
import '../../features/banners/view/banner_form_page.dart';
import '../../features/banners/view/banner_list_page.dart';
import '../../features/categories/bloc/category_cubit.dart';
import '../../features/categories/view/category_form_page.dart';
import '../../features/categories/view/category_list_page.dart';
import '../../features/dashboard/bloc/admin_dashboard_cubit.dart';
import '../../features/dashboard/view/dashboard_page.dart';
import '../../features/finance/bloc/finance_cubit.dart';
import '../../features/finance/view/finance_page.dart';
import '../../features/orders/bloc/admin_order_cubit.dart';
import '../../features/orders/view/order_detail_page.dart';
import '../../features/orders/view/order_list_page.dart';
import '../../features/promos/bloc/promo_cubit.dart';
import '../../features/promos/view/promo_form_page.dart';
import '../../features/promos/view/promo_list_page.dart';
import '../../features/users/bloc/admin_user_management_cubit.dart';
import '../../features/users/models/admin_user_model.dart';
import '../../features/users/view/user_detail_page.dart';
import '../../features/users/view/user_management_page.dart';
import '../../features/products/bloc/product_moderation_cubit.dart';
import '../../features/products/view/product_moderation_detail_page.dart';
import '../../features/products/view/product_moderation_list_page.dart';
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
  static const String categoryCreate =
      'create'; // relative — nested under /categories
  static const String categoryEdit =
      ':id/edit'; // relative — nested under /categories
  static const String users = '/users';
  static const String userDetail = ':id'; // relative — nested under /users
  static const String vendors = '/vendors';
  static const String settings = '/settings';

  // ── Named route constants ──────────────────────────────────────────────────
  static const String dashboardName = 'dashboard';
  static const String loginName = 'login';
  static const String categoriesName = 'categories';
  static const String categoryCreateName = 'categoryCreate';
  static const String categoryEditName = 'categoryEdit';
  static const String usersName = 'users';
  static const String userDetailName = 'userDetail';
  static const String vendorsName = 'vendors';
  static const String vendorDetail = ':id'; // relative — nested under /vendors
  static const String vendorDetailName = 'vendorDetail';
  static const String products = '/products';
  static const String productDetail =
      ':id'; // relative — nested under /products
  static const String productsName = 'products';
  static const String productDetailName = 'productDetail';
  static const String settingsName = 'settings';

  static const String orders = '/orders';
  static const String ordersName = 'orders';
  static const String orderDetail = ':id'; // relative — nested under /orders
  static const String orderDetailName = 'orderDetail';
  static const String finance = '/finance';
  static const String financeName = 'finance';

  static const String banners = '/banners';
  static const String bannersName = 'banners';
  static const String bannerCreate =
      'create'; // relative — nested under /banners
  static const String bannerCreateName = 'bannerCreate';
  static const String bannerEdit =
      ':id/edit'; // relative — nested under /banners
  static const String bannerEditName = 'bannerEdit';

  static const String promos = '/promos';
  static const String promosName = 'promos';
  static const String promoCreate = 'create'; // relative — nested under /promos
  static const String promoCreateName = 'promoCreate';
  static const String promoEdit = ':id/edit'; // relative — nested under /promos
  static const String promoEditName = 'promoEdit';
}

GoRouter buildAppRouter(AuthCubit authCubit) {
  return GoRouter(
    initialLocation: AppRoutes.dashboard,
    refreshListenable: GoRouterRefreshStream(authCubit.stream),
    redirect: (context, state) {
      final authState = authCubit.state;
      final isOnLogin = state.matchedLocation == AppRoutes.login;

      // Still loading — don't redirect
      if (authState is AuthInitial || authState is AuthLoading) return null;

      // Not authenticated — send to login (unless already there)
      if (authState is! AuthAuthenticated) {
        return isOnLogin ? null : AppRoutes.login;
      }

      // Authenticated — redirect away from login page
      if (isOnLogin) return AppRoutes.dashboard;

      return null;
    },
    routes: [
      // Login is outside the admin shell (no sidebar).
      GoRoute(
        name: AppRoutes.loginName,
        path: AppRoutes.login,
        builder: (context, state) => const LoginPage(),
      ),

      // All admin screens share the persistent AdminShell sidebar.
      ShellRoute(
        builder: (context, state, child) =>
            AdminShell(currentLocation: state.matchedLocation, child: child),
        routes: [
          GoRoute(
            name: AppRoutes.dashboardName,
            path: AppRoutes.dashboard,
            builder: (context, state) => BlocProvider.value(
              value: sl<AdminDashboardCubit>(),
              child: const DashboardPage(),
            ),
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

          // Users — list + detail share one lazySingleton cubit.
          GoRoute(
            name: AppRoutes.usersName,
            path: AppRoutes.users,
            builder: (context, state) => BlocProvider.value(
              value: sl<AdminUserManagementCubit>()..ensureLoaded(),
              child: const UserManagementPage(),
            ),
            routes: [
              GoRoute(
                name: AppRoutes.userDetailName,
                path: AppRoutes.userDetail,
                redirect: (context, state) =>
                    state.extra is! AdminUserModel ? AppRoutes.users : null,
                builder: (context, state) => BlocProvider.value(
                  value: sl<AdminUserManagementCubit>(),
                  child: UserDetailPage(
                    userId: (state.extra! as AdminUserModel).id,
                  ),
                ),
              ),
            ],
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
            name: AppRoutes.productsName,
            path: AppRoutes.products,
            builder: (context, state) => BlocProvider.value(
              value: sl<ProductModerationCubit>()..ensureLoaded(),
              child: const ProductModerationListPage(),
            ),
            routes: [
              GoRoute(
                name: AppRoutes.productDetailName,
                path: AppRoutes.productDetail,
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return BlocProvider.value(
                    value: sl<ProductModerationCubit>(),
                    child: ProductModerationDetailPage(productId: id),
                  );
                },
              ),
            ],
          ),
          GoRoute(
            name: AppRoutes.ordersName,
            path: AppRoutes.orders,
            builder: (context, state) => BlocProvider.value(
              value: sl<AdminOrderCubit>()..ensureLoaded(),
              child: const OrderListPage(),
            ),
            routes: [
              GoRoute(
                name: AppRoutes.orderDetailName,
                path: AppRoutes.orderDetail,
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return BlocProvider.value(
                    value: sl<AdminOrderCubit>(),
                    child: OrderDetailPage(orderId: id),
                  );
                },
              ),
            ],
          ),
          GoRoute(
            name: AppRoutes.financeName,
            path: AppRoutes.finance,
            builder: (context, state) => BlocProvider.value(
              value: sl<FinanceCubit>()..ensureLoaded(),
              child: const FinancePage(),
            ),
          ),

          // Banners — list + nested create/edit share one lazySingleton cubit.
          GoRoute(
            name: AppRoutes.bannersName,
            path: AppRoutes.banners,
            builder: (context, state) => BlocProvider.value(
              value: sl<BannerCubit>()..ensureLoaded(),
              child: const BannerListPage(),
            ),
            routes: [
              GoRoute(
                name: AppRoutes.bannerCreateName,
                path: AppRoutes.bannerCreate,
                builder: (context, state) => BlocProvider.value(
                  value: sl<BannerCubit>(),
                  child: const BannerFormPage(),
                ),
              ),
              GoRoute(
                name: AppRoutes.bannerEditName,
                path: AppRoutes.bannerEdit,
                builder: (context, state) => BlocProvider.value(
                  value: sl<BannerCubit>(),
                  child: BannerFormPage(bannerId: state.pathParameters['id']),
                ),
              ),
            ],
          ),

          // Promos — list + nested create/edit share one lazySingleton cubit.
          GoRoute(
            name: AppRoutes.promosName,
            path: AppRoutes.promos,
            builder: (context, state) => BlocProvider.value(
              value: sl<PromoCubit>()..ensureLoaded(),
              child: const PromoListPage(),
            ),
            routes: [
              GoRoute(
                name: AppRoutes.promoCreateName,
                path: AppRoutes.promoCreate,
                builder: (context, state) => BlocProvider.value(
                  value: sl<PromoCubit>(),
                  child: const PromoFormPage(),
                ),
              ),
              GoRoute(
                name: AppRoutes.promoEditName,
                path: AppRoutes.promoEdit,
                builder: (context, state) => BlocProvider.value(
                  value: sl<PromoCubit>(),
                  child: PromoFormPage(promoId: state.pathParameters['id']),
                ),
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
}

/// Converts a Stream into a Listenable for GoRouter's refreshListenable.
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    // Intentional: triggers GoRouter's initial redirect evaluation before any
    // state change has occurred, so the first navigation lands on the right
    // page based on the current AuthState (not just on subsequent stream events).
    notifyListeners();
    _subscription = stream.listen((_) => notifyListeners());
  }

  late final StreamSubscription<dynamic> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}

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
