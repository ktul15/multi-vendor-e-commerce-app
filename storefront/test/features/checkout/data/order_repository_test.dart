import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:storefront/core/network/api_exception.dart';
import 'package:storefront/repositories/order_repository.dart';
import 'package:storefront/shared/models/order_model.dart';
import '../../../mocks.dart';

const _orderJson = {
  'id': 'order-1',
  'orderNumber': 'ORD-20260323-ABCD1234',
  'subtotal': 99.99,
  'discount': 0.0,
  'tax': 0.0,
  'total': 99.99,
  'notes': null,
  'createdAt': '2026-03-23T10:00:00.000Z',
};

void main() {
  late MockHttpClient mockClient;
  late OrderRepository repo;

  setUp(() {
    mockClient = MockHttpClient();
    repo = OrderRepository(client: mockClient);
  });

  group('OrderRepository', () {
    group('createOrder', () {
      test('returns OrderModel on success', () async {
        when(() => mockClient.post('/orders', data: any(named: 'data')))
            .thenAnswer(
          (_) async => {'success': true, 'data': _orderJson},
        );

        final result = await repo.createOrder(addressId: 'addr-1');

        expect(result, isA<OrderModel>());
        expect(result.orderNumber, 'ORD-20260323-ABCD1234');
        expect(result.total, 99.99);
      });

      test('sends promoCode when provided', () async {
        when(() => mockClient.post('/orders', data: any(named: 'data')))
            .thenAnswer(
          (_) async => {'success': true, 'data': _orderJson},
        );

        await repo.createOrder(addressId: 'addr-1', promoCode: 'SAVE10');

        verify(
          () => mockClient.post('/orders', data: {
            'addressId': 'addr-1',
            'promoCode': 'SAVE10',
          }),
        ).called(1);
      });

      test('does not include promoCode when null', () async {
        when(() => mockClient.post('/orders', data: any(named: 'data')))
            .thenAnswer(
          (_) async => {'success': true, 'data': _orderJson},
        );

        await repo.createOrder(addressId: 'addr-1');

        verify(
          () => mockClient.post('/orders', data: {'addressId': 'addr-1'}),
        ).called(1);
      });

      test('throws ApiException on null response', () async {
        when(() => mockClient.post('/orders', data: any(named: 'data')))
            .thenAnswer((_) async => null);

        await expectLater(
          () => repo.createOrder(addressId: 'addr-1'),
          throwsA(isA<ApiException>()),
        );
      });
    });

    group('createPaymentIntent', () {
      test('returns clientSecret string on success', () async {
        when(
          () => mockClient.post('/payments/create-intent',
              data: any(named: 'data')),
        ).thenAnswer(
          (_) async => {
            'success': true,
            'data': {'clientSecret': 'pi_test_secret_123'},
          },
        );

        final result =
            await repo.createPaymentIntent(orderId: 'order-1');

        expect(result, 'pi_test_secret_123');
      });

      test('sends default USD currency', () async {
        when(
          () => mockClient.post('/payments/create-intent',
              data: any(named: 'data')),
        ).thenAnswer(
          (_) async => {
            'success': true,
            'data': {'clientSecret': 'pi_secret'},
          },
        );

        await repo.createPaymentIntent(orderId: 'order-1');

        verify(
          () => mockClient.post('/payments/create-intent',
              data: {'orderId': 'order-1', 'currency': 'USD'}),
        ).called(1);
      });

      test('throws ApiException when clientSecret is missing', () async {
        when(
          () => mockClient.post('/payments/create-intent',
              data: any(named: 'data')),
        ).thenAnswer(
          (_) async => {'success': true, 'data': {}},
        );

        await expectLater(
          () => repo.createPaymentIntent(orderId: 'order-1'),
          throwsA(isA<ApiException>()),
        );
      });

      test('throws ApiException on null response', () async {
        when(
          () => mockClient.post('/payments/create-intent',
              data: any(named: 'data')),
        ).thenAnswer((_) async => null);

        await expectLater(
          () => repo.createPaymentIntent(orderId: 'order-1'),
          throwsA(isA<ApiException>()),
        );
      });
    });
  });
}
