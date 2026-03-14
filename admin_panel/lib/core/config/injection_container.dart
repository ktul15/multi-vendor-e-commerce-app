import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import '../network/api_client.dart';
import '../../features/categories/bloc/category_cubit.dart';
import '../../repositories/category_repository.dart';

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

  // CategoryCubit — lazySingleton (not factory) because the router uses
  // BlocProvider.value across the /categories subroutes (list, create, edit)
  // so all three pages share one live cubit instance. A factory registration
  // would vend a new instance per sl<> call, breaking shared state.
  sl.registerLazySingleton<CategoryCubit>(
    () => CategoryCubit(repository: sl<CategoryRepository>()),
  );
}
