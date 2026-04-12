import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import '../network/api_client.dart';
import '../../features/banners/bloc/banner_cubit.dart';
import '../../features/categories/bloc/category_cubit.dart';
import '../../features/dashboard/bloc/admin_dashboard_cubit.dart';
import '../../features/finance/bloc/finance_cubit.dart';
import '../../features/orders/bloc/admin_order_cubit.dart';
import '../../features/products/bloc/product_moderation_cubit.dart';
import '../../features/promos/bloc/promo_cubit.dart';
import '../../features/users/bloc/admin_user_management_cubit.dart';
import '../../features/vendors/bloc/vendor_cubit.dart';
import '../../repositories/admin_dashboard_repository.dart';
import '../../repositories/admin_finance_repository.dart';
import '../../repositories/admin_order_repository.dart';
import '../../repositories/admin_user_repository.dart';
import '../../repositories/banner_repository.dart';
import '../../repositories/category_repository.dart';
import '../../repositories/product_moderation_repository.dart';
import '../../repositories/promo_repository.dart';
import '../../repositories/vendor_repository.dart';

final sl = GetIt.instance;

Future<void> initDependencies() async {
  // ── Core ──────────────────────────────────────────────────────────────────

  // Single Dio instance shared across all repositories.
  sl.registerLazySingleton<Dio>(() => ApiClient.instance);

  // ── Repositories ──────────────────────────────────────────────────────────

  sl.registerLazySingleton<CategoryRepository>(
    () => CategoryRepository(dio: sl<Dio>()),
  );

  sl.registerLazySingleton<VendorRepository>(
    () => VendorRepository(dio: sl<Dio>()),
  );

  sl.registerLazySingleton<AdminDashboardRepository>(
    () => AdminDashboardRepository(dio: sl<Dio>()),
  );

  sl.registerLazySingleton<AdminUserRepository>(
    () => AdminUserRepository(dio: sl<Dio>()),
  );

  sl.registerLazySingleton<ProductModerationRepository>(
    () => ProductModerationRepository(dio: sl<Dio>()),
  );

  sl.registerLazySingleton<AdminOrderRepository>(
    () => AdminOrderRepository(dio: sl<Dio>()),
  );

  sl.registerLazySingleton<AdminFinanceRepository>(
    () => AdminFinanceRepository(dio: sl<Dio>()),
  );

  sl.registerLazySingleton<BannerRepository>(
    () => BannerRepository(dio: sl<Dio>()),
  );

  sl.registerLazySingleton<PromoRepository>(
    () => PromoRepository(dio: sl<Dio>()),
  );

  // ── BLoCs / Cubits ────────────────────────────────────────────────────────

  // CategoryCubit — lazySingleton (not factory) because the router uses
  // BlocProvider.value across the /categories subroutes (list, create, edit)
  // so all three pages share one live cubit instance. A factory registration
  // would vend a new instance per sl<> call, breaking shared state.
  sl.registerLazySingleton<CategoryCubit>(
    () => CategoryCubit(repository: sl<CategoryRepository>()),
  );

  // VendorCubit — lazySingleton so the list page and detail page share the
  // same live cubit instance via BlocProvider.value in the router.
  sl.registerLazySingleton<VendorCubit>(
    () => VendorCubit(repository: sl<VendorRepository>()),
  );

  // AdminDashboardCubit — lazySingleton so the cubit persists across navigation.
  // ensureLoaded() in the router prevents redundant network calls.
  sl.registerLazySingleton<AdminDashboardCubit>(
    () => AdminDashboardCubit(repository: sl<AdminDashboardRepository>()),
  );

  // AdminUserManagementCubit — lazySingleton so the list and detail pages share
  // the same live cubit instance via BlocProvider.value in the router.
  sl.registerLazySingleton<AdminUserManagementCubit>(
    () => AdminUserManagementCubit(repository: sl<AdminUserRepository>()),
  );

  // ProductModerationCubit — lazySingleton so the list and detail pages share
  // the same live cubit instance via BlocProvider.value in the router.
  sl.registerLazySingleton<ProductModerationCubit>(
    () => ProductModerationCubit(
        repository: sl<ProductModerationRepository>()),
  );

  // AdminOrderCubit — lazySingleton so the list and detail pages share
  // the same live cubit instance via BlocProvider.value in the router.
  sl.registerLazySingleton<AdminOrderCubit>(
    () => AdminOrderCubit(repository: sl<AdminOrderRepository>()),
  );

  // FinanceCubit — lazySingleton so revenue and commission state persists
  // across navigation without redundant network calls.
  sl.registerLazySingleton<FinanceCubit>(
    () => FinanceCubit(repository: sl<AdminFinanceRepository>()),
  );

  // BannerCubit — lazySingleton so list and form pages share the same instance
  // via BlocProvider.value in the router.
  sl.registerLazySingleton<BannerCubit>(
    () => BannerCubit(repository: sl<BannerRepository>()),
  );

  // PromoCubit — lazySingleton so list and form pages share the same instance
  // via BlocProvider.value in the router.
  sl.registerLazySingleton<PromoCubit>(
    () => PromoCubit(repository: sl<PromoRepository>()),
  );
}
