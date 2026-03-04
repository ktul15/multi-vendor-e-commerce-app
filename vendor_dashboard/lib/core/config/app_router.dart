import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/domain/auth_bloc.dart';
import '../../features/auth/domain/auth_state.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../features/auth/presentation/login_screen.dart';

/// App route paths.
class AppRoutes {
  AppRoutes._();

  static const String dashboard = '/';
  static const String login = '/login';
  static const String products = '/products';
  static const String orders = '/orders';
  static const String settings = '/settings';
}

/// GoRouter configuration with auth-aware redirects for vendors.
GoRouter appRouter(AuthBloc authBloc) {
  return GoRouter(
    initialLocation: AppRoutes.dashboard,
    refreshListenable: GoRouterRefreshStream(authBloc.stream),
    redirect: (context, state) {
      final authState = authBloc.state;
      final isLoginRoute = state.matchedLocation == AppRoutes.login;

      if (authState is AuthInitial || authState is AuthLoading) {
        return null;
      }

      // If missing tokens/auth -> redirect to login
      if (authState is! AuthAuthenticated) {
        return isLoginRoute ? null : AppRoutes.login;
      }

      // If authenticated -> don't let them stay on login screen
      if (isLoginRoute) {
        return AppRoutes.dashboard;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.dashboard,
        builder: (context, state) => const DashboardScreen(),
      ),
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const VendorLoginScreen(),
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

  late final dynamic _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
