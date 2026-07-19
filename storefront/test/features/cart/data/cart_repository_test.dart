import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:storefront/repositories/cart_repository.dart';

import '../../../mocks.dart';

void main() {
  test('updateItem uses the backend PUT route', () async {
    final client = MockHttpClient();
    final repository = CartRepository(client: client);

    when(
      () => client.put('/cart/items/item-1', data: {'quantity': 3}),
    ).thenAnswer(
      (_) async => {
        'success': true,
        'data': {
          'id': 'cart-1',
          'userId': 'user-1',
          'items': <Object>[],
          'subtotal': 0,
        },
      },
    );

    final cart = await repository.updateItem('item-1', 3);

    expect(cart.id, 'cart-1');
    verify(
      () => client.put('/cart/items/item-1', data: {'quantity': 3}),
    ).called(1);
    verifyNever(() => client.patch(any(), data: any(named: 'data')));
  });
}
