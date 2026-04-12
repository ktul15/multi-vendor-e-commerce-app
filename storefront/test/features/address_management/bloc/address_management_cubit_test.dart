import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:storefront/core/network/api_exception.dart';
import 'package:storefront/features/address_management/bloc/address_management_cubit.dart';
import 'package:storefront/features/address_management/bloc/address_management_state.dart';
import 'package:storefront/shared/models/address_model.dart';
import '../../../mocks.dart';

// ── Test fixtures ─────────────────────────────────────────────────────────────

final _addr1 = AddressModel(
  id: 'addr-1',
  userId: 'user-1',
  fullName: 'Jane Doe',
  phone: '1234567890',
  street: '1 Main St',
  city: 'Springfield',
  state: 'IL',
  country: 'US',
  zipCode: '62701',
  isDefault: true,
);

final _addr2 = AddressModel(
  id: 'addr-2',
  userId: 'user-1',
  fullName: 'John Doe',
  phone: '0987654321',
  street: '2 Oak Ave',
  city: 'Shelbyville',
  state: 'IL',
  country: 'US',
  zipCode: '62565',
  isDefault: false,
);

final _newAddr = AddressModel(
  id: 'addr-3',
  userId: 'user-1',
  fullName: 'Alice Smith',
  phone: '5551234567',
  street: '3 Elm Rd',
  city: 'Capital City',
  state: 'IL',
  country: 'US',
  zipCode: '62702',
  isDefault: false,
);

// ── Tests ─────────────────────────────────────────────────────────────────────

void main() {
  late MockAddressRepository repo;

  setUp(() {
    repo = MockAddressRepository();
  });

  AddressManagementCubit buildCubit() =>
      AddressManagementCubit(repository: repo);

  // ── loadAddresses ──────────────────────────────────────────────────────────

  group('loadAddresses', () {
    blocTest<AddressManagementCubit, AddressManagementState>(
      'emits [Loading, Loaded] with address list on success',
      setUp: () {
        when(() => repo.getAddresses())
            .thenAnswer((_) async => [_addr1, _addr2]);
      },
      build: buildCubit,
      act: (c) => c.loadAddresses(),
      expect: () => [
        const AddressManagementLoading(),
        AddressManagementLoaded(addresses: [_addr1, _addr2]),
      ],
    );

    blocTest<AddressManagementCubit, AddressManagementState>(
      'emits [Loading, Error] on API error',
      setUp: () {
        when(() => repo.getAddresses())
            .thenThrow(const ApiException('Server error'));
      },
      build: buildCubit,
      act: (c) => c.loadAddresses(),
      expect: () => [
        const AddressManagementLoading(),
        const AddressManagementError(message: 'Server error'),
      ],
    );

    blocTest<AddressManagementCubit, AddressManagementState>(
      'emits [Loading, Error] on network error',
      setUp: () {
        when(() => repo.getAddresses())
            .thenThrow(const NetworkException('No internet connection'));
      },
      build: buildCubit,
      act: (c) => c.loadAddresses(),
      expect: () => [
        const AddressManagementLoading(),
        const AddressManagementError(message: 'No internet connection'),
      ],
    );
  });

  // ── addAddress ─────────────────────────────────────────────────────────────

  group('addAddress', () {
    blocTest<AddressManagementCubit, AddressManagementState>(
      'prepends new address to list on success',
      setUp: () {
        when(() => repo.createAddress(
              fullName: any(named: 'fullName'),
              phone: any(named: 'phone'),
              street: any(named: 'street'),
              city: any(named: 'city'),
              state: any(named: 'state'),
              country: any(named: 'country'),
              zipCode: any(named: 'zipCode'),
            )).thenAnswer((_) async => _newAddr);
      },
      seed: () => AddressManagementLoaded(addresses: [_addr1, _addr2]),
      build: buildCubit,
      act: (c) => c.addAddress(
        fullName: 'Alice Smith',
        phone: '5551234567',
        street: '3 Elm Rd',
        city: 'Capital City',
        state: 'IL',
        country: 'US',
        zipCode: '62702',
      ),
      expect: () => [
        AddressManagementLoaded(addresses: [_addr1, _addr2], isBusy: true),
        AddressManagementLoaded(addresses: [_newAddr, _addr1, _addr2]),
      ],
    );

    blocTest<AddressManagementCubit, AddressManagementState>(
      'emits error on API failure and restores list',
      setUp: () {
        when(() => repo.createAddress(
              fullName: any(named: 'fullName'),
              phone: any(named: 'phone'),
              street: any(named: 'street'),
              city: any(named: 'city'),
              state: any(named: 'state'),
              country: any(named: 'country'),
              zipCode: any(named: 'zipCode'),
            )).thenThrow(const ApiException('Validation failed'));
      },
      seed: () => AddressManagementLoaded(addresses: [_addr1]),
      build: buildCubit,
      act: (c) => c.addAddress(
        fullName: 'X',
        phone: '1234567',
        street: 'A',
        city: 'B',
        state: 'C',
        country: 'US',
        zipCode: '12345',
      ),
      expect: () => [
        AddressManagementLoaded(addresses: [_addr1], isBusy: true),
        AddressManagementLoaded(
          addresses: [_addr1],
          error: 'Validation failed',
        ),
      ],
    );
  });

  // ── updateAddress ──────────────────────────────────────────────────────────

  group('updateAddress', () {
    final updated = _addr2.copyWith(fullName: 'John Updated');

    blocTest<AddressManagementCubit, AddressManagementState>(
      'replaces the address in the list on success',
      setUp: () {
        when(() => repo.updateAddress(
              _addr2.id,
              fullName: any(named: 'fullName'),
              phone: any(named: 'phone'),
              street: any(named: 'street'),
              city: any(named: 'city'),
              state: any(named: 'state'),
              country: any(named: 'country'),
              zipCode: any(named: 'zipCode'),
            )).thenAnswer((_) async => updated);
      },
      seed: () => AddressManagementLoaded(addresses: [_addr1, _addr2]),
      build: buildCubit,
      act: (c) => c.updateAddress(
        _addr2.id,
        fullName: 'John Updated',
        phone: _addr2.phone,
        street: _addr2.street,
        city: _addr2.city,
        state: _addr2.state,
        country: _addr2.country,
        zipCode: _addr2.zipCode,
      ),
      expect: () => [
        AddressManagementLoaded(addresses: [_addr1, _addr2], isBusy: true),
        AddressManagementLoaded(addresses: [_addr1, updated]),
      ],
    );

    blocTest<AddressManagementCubit, AddressManagementState>(
      'emits error and keeps original list on failure',
      setUp: () {
        when(() => repo.updateAddress(
              any(),
              fullName: any(named: 'fullName'),
              phone: any(named: 'phone'),
              street: any(named: 'street'),
              city: any(named: 'city'),
              state: any(named: 'state'),
              country: any(named: 'country'),
              zipCode: any(named: 'zipCode'),
            )).thenThrow(const ApiException('Not found'));
      },
      seed: () => AddressManagementLoaded(addresses: [_addr1, _addr2]),
      build: buildCubit,
      act: (c) => c.updateAddress(
        _addr2.id,
        fullName: 'X',
        phone: '1',
        street: 'A',
        city: 'B',
        state: 'C',
        country: 'US',
        zipCode: '12345',
      ),
      expect: () => [
        AddressManagementLoaded(addresses: [_addr1, _addr2], isBusy: true),
        AddressManagementLoaded(
          addresses: [_addr1, _addr2],
          error: 'Not found',
        ),
      ],
    );
  });

  // ── deleteAddress ──────────────────────────────────────────────────────────

  group('deleteAddress', () {
    blocTest<AddressManagementCubit, AddressManagementState>(
      'removes address from list on success',
      setUp: () {
        when(() => repo.deleteAddress(_addr2.id))
            .thenAnswer((_) async {});
      },
      seed: () => AddressManagementLoaded(addresses: [_addr1, _addr2]),
      build: buildCubit,
      act: (c) => c.deleteAddress(_addr2.id),
      expect: () => [
        AddressManagementLoaded(addresses: [_addr1, _addr2], isBusy: true),
        AddressManagementLoaded(addresses: [_addr1]),
      ],
    );

    blocTest<AddressManagementCubit, AddressManagementState>(
      'emits error and keeps list on failure',
      setUp: () {
        when(() => repo.deleteAddress(any()))
            .thenThrow(const ApiException('Delete failed'));
      },
      seed: () => AddressManagementLoaded(addresses: [_addr1, _addr2]),
      build: buildCubit,
      act: (c) => c.deleteAddress(_addr2.id),
      expect: () => [
        AddressManagementLoaded(addresses: [_addr1, _addr2], isBusy: true),
        AddressManagementLoaded(
          addresses: [_addr1, _addr2],
          error: 'Delete failed',
        ),
      ],
    );

    blocTest<AddressManagementCubit, AddressManagementState>(
      'emits error and keeps list on network error',
      setUp: () {
        when(() => repo.deleteAddress(any()))
            .thenThrow(const NetworkException('No internet connection'));
      },
      seed: () => AddressManagementLoaded(addresses: [_addr1, _addr2]),
      build: buildCubit,
      act: (c) => c.deleteAddress(_addr2.id),
      expect: () => [
        AddressManagementLoaded(addresses: [_addr1, _addr2], isBusy: true),
        AddressManagementLoaded(
          addresses: [_addr1, _addr2],
          error: 'No internet connection',
        ),
      ],
    );
  });

  // ── setDefault ─────────────────────────────────────────────────────────────

  group('setDefault', () {
    // _addr2 becomes default; _addr1 loses its default flag
    final addr1NoDefault = _addr1.copyWith(isDefault: false);
    final addr2Default = _addr2.copyWith(isDefault: true);

    blocTest<AddressManagementCubit, AddressManagementState>(
      'updates isDefault flags across list on success',
      setUp: () {
        when(() => repo.setDefault(_addr2.id))
            .thenAnswer((_) async => addr2Default);
      },
      seed: () => AddressManagementLoaded(addresses: [_addr1, _addr2]),
      build: buildCubit,
      act: (c) => c.setDefault(_addr2.id),
      expect: () => [
        AddressManagementLoaded(addresses: [_addr1, _addr2], isBusy: true),
        AddressManagementLoaded(addresses: [addr1NoDefault, addr2Default]),
      ],
    );

    blocTest<AddressManagementCubit, AddressManagementState>(
      'emits error and keeps list unchanged on failure',
      setUp: () {
        when(() => repo.setDefault(any()))
            .thenThrow(const ApiException('Set default failed'));
      },
      seed: () => AddressManagementLoaded(addresses: [_addr1, _addr2]),
      build: buildCubit,
      act: (c) => c.setDefault(_addr2.id),
      expect: () => [
        AddressManagementLoaded(addresses: [_addr1, _addr2], isBusy: true),
        AddressManagementLoaded(
          addresses: [_addr1, _addr2],
          error: 'Set default failed',
        ),
      ],
    );
  });
}
