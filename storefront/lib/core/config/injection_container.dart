import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import '../network/api_client.dart';
import '../network/token_storage.dart';
import '../../repositories/auth_repository.dart';
import '../../repositories/home_repository.dart';
import '../../features/auth/bloc/auth_bloc.dart';
import '../../features/home/bloc/home_cubit.dart';

/// Global service locator instance.
final sl = GetIt.instance;

/// Register all dependencies.
/// Call this once in main() before runApp().
Future<void> initDependencies() async {
  // ── Core ──────────────────────────────────

  // Token storage (singleton — one instance for secure storage access)
  sl.registerLazySingleton<TokenStorage>(() => TokenStorage());

  // Set token storage on ApiClient so interceptors use the same instance
  ApiClient.tokenStorage = sl<TokenStorage>();

  // Dio HTTP client (singleton — one instance for the app lifetime)
  sl.registerLazySingleton<Dio>(() => ApiClient.instance);

  // ── Repositories ──────────────────────────

  // AuthRepository (lazy singleton — created once when first needed)
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepository(dio: sl<Dio>(), tokenStorage: sl<TokenStorage>()),
  );

  // HomeRepository (lazy singleton — shared across app lifetime)
  sl.registerLazySingleton<HomeRepository>(
    () => HomeRepository(dio: sl<Dio>()),
  );

  // ── BLoCs / Cubits ────────────────────────

  // AuthBloc (factory — new instance each time, disposable)
  sl.registerFactory<AuthBloc>(
    () => AuthBloc(authRepository: sl<AuthRepository>()),
  );

  // HomeCubit (factory — new instance per screen visit)
  sl.registerFactory<HomeCubit>(
    () => HomeCubit(repository: sl<HomeRepository>()),
  );
}
