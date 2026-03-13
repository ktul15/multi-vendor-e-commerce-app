import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import '../network/api_client.dart';
import '../network/dio_http_client.dart';
import '../network/http_client.dart';
import '../network/token_storage.dart';
import '../storage/recent_searches_storage.dart';
import '../../repositories/auth_repository.dart';
import '../../repositories/home_repository.dart';
import '../../repositories/product_detail_repository.dart';
import '../../repositories/product_list_repository.dart';
import '../../repositories/search_repository.dart';
import '../../features/auth/bloc/auth_bloc.dart';
import '../../features/home/bloc/home_cubit.dart';
import '../../features/product_detail/bloc/product_detail_cubit.dart';
import '../../features/product_list/bloc/product_list_cubit.dart';
import '../../features/search/bloc/search_cubit.dart';

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
  // Dio is referenced only here and in DioHttpClient.
  sl.registerLazySingleton<Dio>(() => ApiClient.instance);

  // HttpClient — the transport abstraction used by all repositories.
  // Backed by DioHttpClient; swap to a different impl here to change transport.
  sl.registerLazySingleton<HttpClient>(() => DioHttpClient(sl<Dio>()));

  // ── Repositories ──────────────────────────

  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepository(
      client: sl<HttpClient>(),
      tokenStorage: sl<TokenStorage>(),
    ),
  );

  sl.registerLazySingleton<HomeRepository>(
    () => HomeRepository(client: sl<HttpClient>()),
  );

  sl.registerLazySingleton<ProductListRepository>(
    () => ProductListRepository(client: sl<HttpClient>()),
  );

  sl.registerLazySingleton<ProductDetailRepository>(
    () => ProductDetailRepository(client: sl<HttpClient>()),
  );

  sl.registerLazySingleton<SearchRepository>(
    () => SearchRepository(client: sl<HttpClient>()),
  );

  // ── Core storage ──────────────────────────

  sl.registerLazySingleton<RecentSearchesStorage>(
    () => RecentSearchesStorage(),
  );

  // ── BLoCs / Cubits ────────────────────────

  // AuthBloc (lazy singleton — shared across the app; used by GoRouter
  // refreshListenable and the top-level BlocProvider in main.dart)
  sl.registerLazySingleton<AuthBloc>(
    () => AuthBloc(authRepository: sl<AuthRepository>()),
  );

  // HomeCubit (factory — new instance per screen visit)
  sl.registerFactory<HomeCubit>(
    () => HomeCubit(repository: sl<HomeRepository>()),
  );

  // ProductListCubit (factory — new instance per screen visit)
  sl.registerFactory<ProductListCubit>(
    () => ProductListCubit(repository: sl<ProductListRepository>()),
  );

  // ProductDetailCubit (factory — new instance per product page visit)
  sl.registerFactory<ProductDetailCubit>(
    () => ProductDetailCubit(repository: sl<ProductDetailRepository>()),
  );

  // SearchCubit (factory — new instance per search screen visit)
  sl.registerFactory<SearchCubit>(
    () => SearchCubit(
      repository: sl<SearchRepository>(),
      storage: sl<RecentSearchesStorage>(),
    ),
  );
}
