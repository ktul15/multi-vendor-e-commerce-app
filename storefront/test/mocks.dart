import 'package:mocktail/mocktail.dart';
import 'package:storefront/core/network/http_client.dart';
import 'package:storefront/core/stripe/stripe_service.dart';
import 'package:storefront/features/cart/bloc/cart_cubit.dart';
import 'package:storefront/repositories/address_repository.dart';
import 'package:storefront/repositories/order_repository.dart';

class MockHttpClient extends Mock implements HttpClient {}

class MockStripeService extends Mock implements StripeService {}

class MockAddressRepository extends Mock implements AddressRepository {}

class MockOrderRepository extends Mock implements OrderRepository {}

class MockCartCubit extends Mock implements CartCubit {}
