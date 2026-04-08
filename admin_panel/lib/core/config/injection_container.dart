import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import '../network/api_client.dart';
import '../../features/categories/bloc/category_cubit.dart';
import '../../features/dashboard/bloc/admin_dashboard_cubit.dart';
import '../../features/users/bloc/admin_user_management_cubit.dart';
import '../../features/vendors/bloc/vendor_cubit.dart';
import '../../repositories/admin_dashboard_repository.dart';
import '../../repositories/admin_user_repository.dart';
import '../../repositories/category_repository.dart';
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
}
