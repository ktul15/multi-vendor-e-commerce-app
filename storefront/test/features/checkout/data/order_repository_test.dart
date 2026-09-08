import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:storefront/core/network/api_exception.dart';
import 'package:storefront/repositories/order_repository.dart';
import 'package:storefront/shared/models/order_model.dart';
import '../../../mocks.dart';

const _orderJson = {
  'id': 'order-1',
  'orderNumber': 'ORD-20260323-ABCD1234',
  'subtotal': '99.99',
  'discount': '0.00',
  'tax': '0.00',
  'total': '99.99',
  'notes': null,
  'createdAt': '2026-03-23T10:00:00.000Z',
  'vendorOrders': [
    {
      'id': 'vendor-order-1',
      'status': 'PENDING',
      'subtotal': '99.99',
      '_count': {'items': 1},
    },
  ],
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
        when(
          () => mockClient.post('/orders', data: any(named: 'data')),
        ).thenAnswer((_) async => {'success': true, 'data': _orderJson});

        final result = await repo.createOrder(addressId: 'addr-1');

        expect(result, isA<OrderModel>());
        expect(result.orderNumber, 'ORD-20260323-ABCD1234');
        expect(result.total, 99.99);
        expect(result.vendorOrders.single.subtotal, 99.99);
      });

      test('sends promoCode when provided', () async {
        when(
          () => mockClient.post('/orders', data: any(named: 'data')),
        ).thenAnswer((_) async => {'success': true, 'data': _orderJson});

        await repo.createOrder(addressId: 'addr-1', promoCode: 'SAVE10');

        verify(
          () => mockClient.post(
            '/orders',
            data: {'addressId': 'addr-1', 'promoCode': 'SAVE10'},
          ),
        ).called(1);
      });

      test('does not include promoCode when null', () async {
        when(
          () => mockClient.post('/orders', data: any(named: 'data')),
        ).thenAnswer((_) async => {'success': true, 'data': _orderJson});

        await repo.createOrder(addressId: 'addr-1');

        verify(
          () => mockClient.post('/orders', data: {'addressId': 'addr-1'}),
        ).called(1);
      });

      test('throws ApiException on null response', () async {
        when(
          () => mockClient.post('/orders', data: any(named: 'data')),
        ).thenAnswer((_) async => null);

        await expectLater(
          () => repo.createOrder(addressId: 'addr-1'),
          throwsA(isA<ApiException>()),
        );
      });
    });

    group('createPaymentCheckout', () {
      test('returns a Stripe checkout on success', () async {
        when(
          () => mockClient.post('/payments/checkout', data: any(named: 'data')),
        ).thenAnswer(
          (_) async => {
            'success': true,
            'data': {
              'provider': 'STRIPE',
              'clientSecret': 'pi_test_secret_123',
            },
          },
        );

        final result = await repo.createPaymentCheckout(orderId: 'order-1');

        expect(result.provider.name, 'stripe');
        expect(result.clientSecret, 'pi_test_secret_123');
      });

      test('uses the server-defined INR currency', () async {
        when(
          () => mockClient.post('/payments/checkout', data: any(named: 'data')),
        ).thenAnswer(
          (_) async => {
            'success': true,
            'data': {'provider': 'STRIPE', 'clientSecret': 'pi_secret'},
          },
        );

        await repo.createPaymentCheckout(orderId: 'order-1');

        verify(
          () => mockClient.post(
            '/payments/checkout',
            data: {'orderId': 'order-1'},
          ),
        ).called(1);
      });

      test(
        'parses Razorpay checkout fields without accepting a client provider',
        () async {
          when(
            () =>
                mockClient.post('/payments/checkout', data: any(named: 'data')),
          ).thenAnswer(
            (_) async => {
              'data': {
                'provider': 'RAZORPAY',
                'providerOrderId': 'order_test_1',
                'keyId': 'rzp_test_1',
                'amount': 1250,
                'currency': 'INR',
              },
            },
          );

          final result = await repo.createPaymentCheckout(orderId: 'order-1');

          expect(result.provider.name, 'razorpay');
          expect(result.providerOrderId, 'order_test_1');
          verify(
            () => mockClient.post(
              '/payments/checkout',
              data: {'orderId': 'order-1'},
            ),
          ).called(1);
        },
      );

      test('throws ApiException when clientSecret is missing', () async {
        when(
          () => mockClient.post('/payments/checkout', data: any(named: 'data')),
        ).thenAnswer((_) async => {'success': true, 'data': {}});

        await expectLater(
          () => repo.createPaymentCheckout(orderId: 'order-1'),
          throwsA(isA<ApiException>()),
        );
      });

      test('throws ApiException on null response', () async {
        when(
          () => mockClient.post('/payments/checkout', data: any(named: 'data')),
        ).thenAnswer((_) async => null);

        await expectLater(
          () => repo.createPaymentCheckout(orderId: 'order-1'),
          throwsA(isA<ApiException>()),
        );
      });
    });
  });
}
