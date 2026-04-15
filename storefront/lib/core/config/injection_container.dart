import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import '../network/api_client.dart';
import '../network/dio_http_client.dart';
import '../network/http_client.dart';
import '../network/token_storage.dart';
import '../storage/recent_searches_storage.dart';
import '../storage/theme_storage.dart';
import '../../features/settings/bloc/theme_cubit.dart';
import '../../repositories/auth_repository.dart';
import '../../repositories/home_repository.dart';
import '../../repositories/product_detail_repository.dart';
import '../../repositories/product_list_repository.dart';
import '../../repositories/address_repository.dart';
import '../../repositories/cart_repository.dart';
import '../../repositories/order_repository.dart';
import '../../repositories/notification_repository.dart';
import '../../repositories/review_repository.dart';
import '../../repositories/search_repository.dart';
import '../../repositories/wishlist_repository.dart';
import '../../features/address_management/bloc/address_management_cubit.dart';
import '../../features/auth/bloc/auth_bloc.dart';
import '../../features/cart/bloc/cart_cubit.dart';
import '../../features/checkout/bloc/checkout_bloc.dart';
import '../../features/notifications/bloc/notification_cubit.dart';
import '../../features/order_detail/bloc/order_detail_cubit.dart';
import '../../features/order_history/bloc/order_list_cubit.dart';
import '../services/push_notification_service.dart';
import '../stripe/flutter_stripe_service.dart';
import '../stripe/stripe_service.dart';
import '../../features/home/bloc/home_cubit.dart';
import '../../features/product_detail/bloc/product_detail_cubit.dart';
import '../../features/product_list/bloc/product_list_cubit.dart';
import '../../features/search/bloc/search_cubit.dart';
import '../../features/wishlist/bloc/wishlist_cubit.dart';

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

  sl.registerLazySingleton<CartRepository>(
    () => CartRepository(client: sl<HttpClient>()),
  );

  sl.registerLazySingleton<AddressRepository>(
    () => AddressRepository(client: sl<HttpClient>()),
  );

  sl.registerLazySingleton<OrderRepository>(
    () => OrderRepository(client: sl<HttpClient>()),
  );

  sl.registerLazySingleton<NotificationRepository>(
    () => NotificationRepository(client: sl<HttpClient>()),
  );

  sl.registerLazySingleton<ReviewRepository>(
    () => ReviewRepository(client: sl<HttpClient>()),
  );

  sl.registerLazySingleton<WishlistRepository>(
    () => WishlistRepository(client: sl<HttpClient>()),
  );

  // ── Services ──────────────────────────────

  sl.registerLazySingleton<StripeService>(
    () => const FlutterStripeService(),
  );

  sl.registerLazySingleton<PushNotificationService>(
    () => PushNotificationService(
      notificationRepository: sl<NotificationRepository>(),
    ),
  );

  // ── Core storage ──────────────────────────

  sl.registerLazySingleton<RecentSearchesStorage>(
    () => RecentSearchesStorage(),
  );

  // ThemeCubit (singleton — drives the root MaterialApp themeMode, must persist
  // across all routes; same rationale as AuthBloc). loadTheme() is awaited here
  // so the preference is loaded before runApp and ThemeLoaded is the only
  // observable state during the app lifetime.
  final themeStorage = ThemeStorage();
  final themeCubit = ThemeCubit(storage: themeStorage);
  await themeCubit.loadTheme();
  sl.registerSingleton<ThemeStorage>(themeStorage);
  sl.registerSingleton<ThemeCubit>(themeCubit);

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

  // CartCubit (lazySingleton — shared global state: home badge, product detail, cart page)
  sl.registerLazySingleton<CartCubit>(
    () => CartCubit(repository: sl<CartRepository>()),
  );

  // NotificationCubit (lazySingleton — shared global state: home badge, notification center)
  sl.registerLazySingleton<NotificationCubit>(
    () => NotificationCubit(
      repository: sl<NotificationRepository>(),
      pushService: sl<PushNotificationService>(),
    ),
  );

  // SearchCubit (factory — new instance per search screen visit)
  sl.registerFactory<SearchCubit>(
    () => SearchCubit(
      repository: sl<SearchRepository>(),
      storage: sl<RecentSearchesStorage>(),
    ),
  );

  // AddressManagementCubit (factory — fresh instance per screen visit)
  sl.registerFactory<AddressManagementCubit>(
    () => AddressManagementCubit(repository: sl<AddressRepository>()),
  );

  // OrderListCubit (factory — new instance per screen visit)
  sl.registerFactory<OrderListCubit>(
    () => OrderListCubit(repository: sl<OrderRepository>()),
  );

  // OrderDetailCubit (factory — new instance per detail view)
  sl.registerFactory<OrderDetailCubit>(
    () => OrderDetailCubit(repository: sl<OrderRepository>()),
  );

  // WishlistCubit (lazySingleton — shared global state: product detail heart, wishlist page)
  sl.registerLazySingleton<WishlistCubit>(
    () => WishlistCubit(repository: sl<WishlistRepository>()),
  );

  // CheckoutBloc (factory — fresh instance per checkout session)
  sl.registerFactory<CheckoutBloc>(
    () => CheckoutBloc(
      addressRepository: sl<AddressRepository>(),
      orderRepository: sl<OrderRepository>(),
      stripeService: sl<StripeService>(),
      cartCubit: sl<CartCubit>(),
    ),
  );
}
