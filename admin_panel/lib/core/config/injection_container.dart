import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import '../network/api_client.dart';
import '../../features/categories/data/category_repository.dart';
import '../../features/categories/presentation/category_cubit.dart';

final sl = GetIt.instance;

Future<void> initDependencies() async {
  // ── Core ──────────────────────────────────────────────────────────────────

  // Single Dio instance shared across all repositories.
  sl.registerLazySingleton<Dio>(() => ApiClient.instance);

  // ── Repositories ──────────────────────────────────────────────────────────

  sl.registerLazySingleton<CategoryRepository>(
    () => CategoryRepository(dio: sl<Dio>()),
  );

  // ── BLoCs / Cubits ────────────────────────────────────────────────────────

  // CategoryCubit — lazySingleton so list + form screens share the same state
  // and BlocProvider.value in the router never loses the cubit on navigation.
  sl.registerLazySingleton<CategoryCubit>(
    () => CategoryCubit(repository: sl<CategoryRepository>()),
  );
}
