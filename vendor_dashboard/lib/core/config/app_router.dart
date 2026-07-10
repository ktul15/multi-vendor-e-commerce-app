import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/bloc/auth_bloc.dart';
import '../../features/auth/bloc/auth_state.dart';
import '../../features/auth/view/login_page.dart';
import '../../features/auth/view/register_page.dart';
import '../../features/dashboard/view/dashboard_page.dart';
import '../../features/earnings/view/earnings_page.dart';
import '../../features/orders/view/orders_page.dart';
import '../../features/products/view/products_page.dart';
import '../../features/shell/view/shell_page.dart';
import '../../features/store/view/store_page.dart';
import '../../shared/widgets/vendor_status_gate.dart';

/// App route paths.
class AppRoutes {
  AppRoutes._();

  static const String dashboard = '/';
  static const String login = '/login';
  static const String register = '/register';
  static const String products = '/products';
  static const String orders = '/orders';
  static const String earnings = '/earnings';
  static const String store = '/store';
}

/// GoRouter configuration with auth-aware redirects for vendors.
GoRouter appRouter(AuthBloc authBloc) {
  return GoRouter(
    initialLocation: AppRoutes.dashboard,
    refreshListenable: GoRouterRefreshStream(authBloc.stream),
    redirect: (context, state) {
      final authState = authBloc.state;
      final isAuthRoute =
          state.matchedLocation == AppRoutes.login ||
          state.matchedLocation == AppRoutes.register;

      // During the initial auth check, treat as unauthenticated to prevent
      // protected routes from rendering before credentials are verified.
      if (authState is AuthInitial ||
          authState is AuthLoading ||
          authState is! AuthAuthenticated) {
        return isAuthRoute ? null : AppRoutes.login;
      }

      if (isAuthRoute) {
        return AppRoutes.dashboard;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const VendorLoginPage(),
      ),
      GoRoute(
        path: AppRoutes.register,
        builder: (context, state) => const VendorRegisterPage(),
      ),
      ShellRoute(
        builder: (context, state, child) => ShellPage(child: child),
        routes: [
          GoRoute(
            path: AppRoutes.dashboard,
            builder: (context, state) =>
                const VendorStatusGate(child: DashboardPage()),
          ),
          GoRoute(
            path: AppRoutes.products,
            builder: (context, state) =>
                const VendorStatusGate(child: ProductsPage()),
          ),
          GoRoute(
            path: AppRoutes.orders,
            builder: (context, state) =>
                const VendorStatusGate(child: OrdersPage()),
          ),
          GoRoute(
            path: AppRoutes.earnings,
            builder: (context, state) =>
                const VendorStatusGate(child: EarningsPage()),
          ),
          GoRoute(
            path: AppRoutes.store,
            builder: (context, state) => const StorePage(),
          ),
        ],
      ),
    ],
  );
}

/// Converts a Stream into a Listenable for GoRouter's refreshListenable.
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  late final StreamSubscription<dynamic> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
