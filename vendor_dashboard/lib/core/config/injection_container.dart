import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../network/api_client.dart';
import '../network/token_storage.dart';
import '../../repositories/analytics_repository.dart';
import '../../repositories/auth_repository.dart';
import '../../repositories/order_repository.dart';
import '../../repositories/product_repository.dart';
import '../../repositories/vendor_profile_repository.dart';
import '../../features/auth/bloc/auth_bloc.dart';
import '../../features/dashboard/bloc/dashboard_cubit.dart';
import '../../features/earnings/bloc/earnings_cubit.dart';
import '../../features/orders/bloc/orders_cubit.dart';
import '../../features/products/bloc/products_cubit.dart';
import '../../features/store/bloc/store_cubit.dart';

/// Global service locator instance.
final sl = GetIt.instance;

/// Register all dependencies.
/// Call this once in main() before runApp().
Future<void> initDependencies() async {
  // Wait for SharedPreferences
  final prefs = await SharedPreferences.getInstance();
  sl.registerLazySingleton<SharedPreferences>(() => prefs);

  // ── Core ──────────────────────────────────

  // Token storage (singleton)
  sl.registerLazySingleton<TokenStorage>(
    () => TokenStorage(prefs: sl<SharedPreferences>()),
  );

  // Set token storage on ApiClient so interceptors use it
  ApiClient.tokenStorage = sl<TokenStorage>();

  // Dio HTTP client (singleton)
  sl.registerLazySingleton<Dio>(() => ApiClient.instance);

  // ── Repositories ──────────────────────────

  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepository(dio: sl<Dio>(), tokenStorage: sl<TokenStorage>()),
  );

  sl.registerLazySingleton<AnalyticsRepository>(
    () => AnalyticsRepository(dio: sl<Dio>()),
  );

  sl.registerLazySingleton<OrderRepository>(
    () => OrderRepository(dio: sl<Dio>()),
  );

  sl.registerLazySingleton<ProductRepository>(
    () => ProductRepository(dio: sl<Dio>()),
  );

  sl.registerLazySingleton<VendorProfileRepository>(
    () => VendorProfileRepository(dio: sl<Dio>()),
  );

  // ── BLoCs / Cubits ────────────────────────

  sl.registerFactory<AuthBloc>(
    () => AuthBloc(authRepository: sl<AuthRepository>()),
  );

  sl.registerFactory<DashboardCubit>(
    () => DashboardCubit(
      analyticsRepository: sl<AnalyticsRepository>(),
      orderRepository: sl<OrderRepository>(),
    ),
  );

  sl.registerFactory<OrdersCubit>(
    () => OrdersCubit(orderRepository: sl<OrderRepository>()),
  );

  // ProductsCubit requires a vendorId — use registerFactoryParam so callers
  // pass it via sl<ProductsCubit>(param1: vendorId).
  sl.registerFactoryParam<ProductsCubit, String, void>(
    (vendorId, _) => ProductsCubit(
      productRepository: sl<ProductRepository>(),
      vendorId: vendorId,
    ),
  );

  sl.registerFactory<StoreCubit>(
    () => StoreCubit(profileRepository: sl<VendorProfileRepository>()),
  );

  sl.registerFactory<EarningsCubit>(
    () => EarningsCubit(analyticsRepository: sl<AnalyticsRepository>()),
  );
}
