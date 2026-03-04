import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../network/api_client.dart';
import '../network/token_storage.dart';
import '../../features/auth/data/auth_repository.dart';
import '../../features/auth/domain/auth_bloc.dart';

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

  // AuthRepository (lazy singleton)
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepository(dio: sl<Dio>(), tokenStorage: sl<TokenStorage>()),
  );

  // ── BLoCs ─────────────────────────────────

  // AuthBloc (factory — new instance each time)
  sl.registerFactory<AuthBloc>(
    () => AuthBloc(authRepository: sl<AuthRepository>()),
  );
}
