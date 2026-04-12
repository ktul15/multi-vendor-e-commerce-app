import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:storefront/core/network/api_exception.dart';
import 'package:storefront/repositories/address_repository.dart';
import 'package:storefront/shared/models/address_model.dart';
import '../../../mocks.dart';

const _addressJson = {
  'id': 'addr-1',
  'userId': 'user-1',
  'fullName': 'John Doe',
  'phone': '1234567890',
  'street': '123 Main St',
  'city': 'Springfield',
  'state': 'IL',
  'country': 'US',
  'zipCode': '62701',
  'isDefault': true,
};

void main() {
  late MockHttpClient mockClient;
  late AddressRepository repo;

  setUp(() {
    mockClient = MockHttpClient();
    repo = AddressRepository(client: mockClient);
  });

  group('AddressRepository', () {
    group('getAddresses', () {
      test('returns list of addresses on success', () async {
        when(() => mockClient.get('/addresses')).thenAnswer(
          (_) async => {
            'success': true,
            'data': [_addressJson],
          },
        );

        final result = await repo.getAddresses();

        expect(result, hasLength(1));
        expect(result.first.id, 'addr-1');
        expect(result.first.fullName, 'John Doe');
        expect(result.first.isDefault, true);
      });

      test('throws ApiException when data is null', () async {
        when(() => mockClient.get('/addresses')).thenAnswer((_) async => null);

        expect(() => repo.getAddresses(), throwsA(isA<ApiException>()));
      });

      test('throws ApiException when data is not a list', () async {
        when(() => mockClient.get('/addresses')).thenAnswer(
          (_) async => {'success': true, 'data': {}},
        );

        expect(() => repo.getAddresses(), throwsA(isA<ApiException>()));
      });
    });

    group('createAddress', () {
      test('returns created address on success', () async {
        when(() => mockClient.post('/addresses', data: any(named: 'data')))
            .thenAnswer(
          (_) async => {'success': true, 'data': _addressJson},
        );

        final result = await repo.createAddress(
          fullName: 'John Doe',
          phone: '1234567890',
          street: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          country: 'US',
          zipCode: '62701',
        );

        expect(result, isA<AddressModel>());
        expect(result.city, 'Springfield');
      });

      test('throws ApiException on failure', () async {
        when(() => mockClient.post('/addresses', data: any(named: 'data')))
            .thenAnswer((_) async => null);

        await expectLater(
          () => repo.createAddress(
            fullName: 'John',
            phone: '1234567',
            street: 'A',
            city: 'B',
            state: 'C',
            country: 'US',
            zipCode: '12345',
          ),
          throwsA(isA<ApiException>()),
        );
      });
    });

    group('setDefault', () {
      test('returns updated address on success', () async {
        when(() => mockClient.patch('/addresses/addr-1/default'))
            .thenAnswer(
          (_) async => {'success': true, 'data': _addressJson},
        );

        final result = await repo.setDefault('addr-1');

        expect(result.isDefault, true);
        verify(() => mockClient.patch('/addresses/addr-1/default')).called(1);
      });

      test('throws ApiException on null response', () async {
        when(() => mockClient.patch('/addresses/addr-1/default'))
            .thenAnswer((_) async => null);

        await expectLater(
          () => repo.setDefault('addr-1'),
          throwsA(isA<ApiException>()),
        );
      });
    });
  });
}
