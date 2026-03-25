import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../../../repositories/address_repository.dart';
import 'address_management_state.dart';

class AddressManagementCubit extends Cubit<AddressManagementState> {
  final AddressRepository _repository;

  AddressManagementCubit({required AddressRepository repository})
      : _repository = repository,
        super(const AddressManagementLoading());

  // ── Load ──────────────────────────────────────────────────────────────────

  Future<void> loadAddresses() async {
    emit(const AddressManagementLoading());
    try {
      final addresses = await _repository.getAddresses();
      emit(AddressManagementLoaded(addresses: addresses));
    } on ApiException catch (e) {
      emit(AddressManagementError(message: e.message));
    } on NetworkException catch (e) {
      emit(AddressManagementError(message: e.message));
    } catch (e) {
      emit(AddressManagementError(message: e.toString()));
    }
  }

  // ── Add ───────────────────────────────────────────────────────────────────

  Future<void> addAddress({
    required String fullName,
    required String phone,
    required String street,
    required String city,
    required String state,
    required String country,
    required String zipCode,
  }) async {
    final current = this.state;
    if (current is! AddressManagementLoaded) return;
    emit(current.copyWith(isBusy: true, clearError: true));
    try {
      final created = await _repository.createAddress(
        fullName: fullName,
        phone: phone,
        street: street,
        city: city,
        state: state,
        country: country,
        zipCode: zipCode,
      );
      // If the backend auto-promoted the new address to default (e.g. it's
      // the first address), clear isDefault on all pre-existing entries so
      // local state stays consistent with the server without a full reload.
      final existing = created.isDefault
          ? current.addresses.map((a) => a.copyWith(isDefault: false)).toList()
          : current.addresses;
      emit(current.copyWith(
        addresses: [created, ...existing],
        isBusy: false,
      ));
    } on ApiException catch (e) {
      emit(current.copyWith(isBusy: false, error: e.message));
    } on NetworkException catch (e) {
      emit(current.copyWith(isBusy: false, error: e.message));
    } catch (e) {
      emit(current.copyWith(isBusy: false, error: e.toString()));
    }
  }

  // ── Update ────────────────────────────────────────────────────────────────

  Future<void> updateAddress(
    String id, {
    required String fullName,
    required String phone,
    required String street,
    required String city,
    required String state,
    required String country,
    required String zipCode,
  }) async {
    final current = this.state;
    if (current is! AddressManagementLoaded) return;
    emit(current.copyWith(isBusy: true, clearError: true));
    try {
      final updated = await _repository.updateAddress(
        id,
        fullName: fullName,
        phone: phone,
        street: street,
        city: city,
        state: state,
        country: country,
        zipCode: zipCode,
      );
      final addresses = current.addresses
          .map((a) => a.id == id ? updated : a)
          .toList();
      emit(current.copyWith(addresses: addresses, isBusy: false));
    } on ApiException catch (e) {
      emit(current.copyWith(isBusy: false, error: e.message));
    } on NetworkException catch (e) {
      emit(current.copyWith(isBusy: false, error: e.message));
    } catch (e) {
      emit(current.copyWith(isBusy: false, error: e.toString()));
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  Future<void> deleteAddress(String id) async {
    final current = state;
    if (current is! AddressManagementLoaded) return;
    emit(current.copyWith(isBusy: true, clearError: true));
    try {
      await _repository.deleteAddress(id);
      final addresses = current.addresses.where((a) => a.id != id).toList();
      emit(current.copyWith(addresses: addresses, isBusy: false));
    } on ApiException catch (e) {
      emit(current.copyWith(isBusy: false, error: e.message));
    } on NetworkException catch (e) {
      emit(current.copyWith(isBusy: false, error: e.message));
    } catch (e) {
      emit(current.copyWith(isBusy: false, error: e.toString()));
    }
  }

  // ── Set Default ───────────────────────────────────────────────────────────

  Future<void> setDefault(String id) async {
    final current = state;
    if (current is! AddressManagementLoaded) return;
    emit(current.copyWith(isBusy: true, clearError: true));
    try {
      final updated = await _repository.setDefault(id);
      final addresses = current.addresses.map((a) {
        if (a.id == id) return updated;
        // Clear isDefault from all others (only one default allowed).
        return a.isDefault ? a.copyWith(isDefault: false) : a;
      }).toList();
      emit(current.copyWith(addresses: addresses, isBusy: false));
    } on ApiException catch (e) {
      emit(current.copyWith(isBusy: false, error: e.message));
    } on NetworkException catch (e) {
      emit(current.copyWith(isBusy: false, error: e.message));
    } catch (e) {
      emit(current.copyWith(isBusy: false, error: e.toString()));
    }
  }
}
