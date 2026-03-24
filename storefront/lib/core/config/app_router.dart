import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/bloc/auth_bloc.dart';
import '../../features/auth/bloc/auth_state.dart';
import '../../features/auth/view/login_page.dart';
import '../../features/auth/view/register_page.dart';
import '../../features/auth/view/forgot_password_page.dart';
import '../../features/home/view/home_page.dart';
import '../../features/product_detail/view/product_detail_page.dart';
import '../../features/product_list/view/product_list_page.dart';
import '../../features/cart/view/cart_page.dart';
import '../../features/checkout/view/checkout_page.dart';
import '../../features/checkout/view/checkout_success_page.dart';
import '../../features/search/view/search_page.dart';
import '../../shared/models/order_model.dart';
import '../../shared/models/product_filters.dart';

/// App route paths and names — centralized to avoid magic strings.
class AppRoutes {
  AppRoutes._();

  // ── Paths ──────────────────────────────────────────
  static const String home = '/';
  static const String login = '/login';
  static const String register = '/register';
  static const String forgotPassword = '/forgot-password';
  static const String products = '/products';
  static const String productDetail = '/product/:id';
  static const String search = '/search';
  static const String cart = '/cart';
  static const String profile = '/profile';
  static const String checkout = '/checkout';
  static const String checkoutSuccess = '/checkout/success';

  // ── Names (used with pushNamed / goNamed) ──────────
  static const String homeName = 'home';
  static const String loginName = 'login';
  static const String registerName = 'register';
  static const String forgotPasswordName = 'forgotPassword';
  static const String productsName = 'products';
  static const String productDetailName = 'productDetail';
  static const String searchName = 'search';
  static const String cartName = 'cart';
  static const String profileName = 'profile';
  static const String checkoutName = 'checkout';
  static const String checkoutSuccessName = 'checkoutSuccess';
}

/// GoRouter configuration with auth-aware redirects.
GoRouter appRouter(AuthBloc authBloc) {
  return GoRouter(
    initialLocation: AppRoutes.home,
    refreshListenable: GoRouterRefreshStream(authBloc.stream),
    redirect: (context, state) {
      final authState = authBloc.state;
      final isOnAuthPage =
          state.matchedLocation == AppRoutes.login ||
          state.matchedLocation == AppRoutes.register ||
          state.matchedLocation == AppRoutes.forgotPassword;

      // Still loading — don't redirect
      if (authState is AuthInitial || authState is AuthLoading) {
        return null;
      }

      // Not authenticated — redirect to login (unless already on auth page)
      if (authState is! AuthAuthenticated) {
        return isOnAuthPage ? null : AppRoutes.login;
      }

      // Authenticated — redirect away from auth pages
      if (isOnAuthPage) {
        return AppRoutes.home;
      }

      return null;
    },
    routes: [
      GoRoute(
        name: AppRoutes.homeName,
        path: AppRoutes.home,
        builder: (context, state) => const HomePage(),
      ),
      GoRoute(
        name: AppRoutes.loginName,
        path: AppRoutes.login,
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        name: AppRoutes.registerName,
        path: AppRoutes.register,
        builder: (context, state) => const RegisterPage(),
      ),
      GoRoute(
        name: AppRoutes.forgotPasswordName,
        path: AppRoutes.forgotPassword,
        builder: (context, state) => const ForgotPasswordPage(),
      ),
      GoRoute(
        name: AppRoutes.productsName,
        path: AppRoutes.products,
        builder: (context, state) {
          final title = state.uri.queryParameters['title'] ?? 'Products';
          final categoryId = state.uri.queryParameters['categoryId'];
          return ProductListPage(
            title: title,
            initialFilters: ProductFilters(categoryId: categoryId),
          );
        },
      ),
      GoRoute(
        name: AppRoutes.productDetailName,
        path: AppRoutes.productDetail,
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return ProductDetailPage(productId: id);
        },
      ),
      GoRoute(
        name: AppRoutes.searchName,
        path: AppRoutes.search,
        builder: (context, state) => const SearchPage(),
      ),
      GoRoute(
        name: AppRoutes.cartName,
        path: AppRoutes.cart,
        builder: (context, state) => const CartPage(),
      ),
      GoRoute(
        name: AppRoutes.checkoutName,
        path: AppRoutes.checkout,
        builder: (context, state) => const CheckoutPage(),
      ),
      GoRoute(
        name: AppRoutes.checkoutSuccessName,
        path: AppRoutes.checkoutSuccess,
        builder: (context, state) {
          final order = state.extra as OrderModel?;
          // extra is null on deep-link or hot-restart; redirect home gracefully.
          if (order == null) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (context.mounted) context.go(AppRoutes.home);
            });
            return const SizedBox.shrink();
          }
          return CheckoutSuccessPage(order: order);
        },
      ),
    ],
  );
}

/// Converts a Stream into a Listenable for GoRouter's refreshListenable.
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
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
