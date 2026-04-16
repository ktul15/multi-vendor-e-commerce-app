import 'package:bloc_test/bloc_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:storefront/core/network/http_client.dart';
import 'package:storefront/core/stripe/stripe_service.dart';
import 'package:storefront/features/auth/bloc/auth_bloc.dart';
import 'package:storefront/features/auth/bloc/auth_event.dart';
import 'package:storefront/features/auth/bloc/auth_state.dart';
import 'package:storefront/features/cart/bloc/cart_cubit.dart';
import 'package:storefront/features/cart/bloc/cart_state.dart';
import 'package:storefront/repositories/address_repository.dart';
import 'package:storefront/repositories/cart_repository.dart';
import 'package:storefront/repositories/order_repository.dart';

class MockHttpClient extends Mock implements HttpClient {}

class MockStripeService extends Mock implements StripeService {}

class MockAddressRepository extends Mock implements AddressRepository {}

class MockOrderRepository extends Mock implements OrderRepository {}

class MockCartRepository extends Mock implements CartRepository {}

class MockCartCubit extends MockCubit<CartState> implements CartCubit {}

class MockAuthBloc extends MockBloc<AuthEvent, AuthState> implements AuthBloc {}
