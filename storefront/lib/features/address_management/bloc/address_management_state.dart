import 'package:equatable/equatable.dart';
import '../../../shared/models/address_model.dart';

sealed class AddressManagementState extends Equatable {
  const AddressManagementState();

  @override
  List<Object?> get props => [];
}

class AddressManagementLoading extends AddressManagementState {
  const AddressManagementLoading();
}

class AddressManagementLoaded extends AddressManagementState {
  final List<AddressModel> addresses;

  /// True while a mutation (add/edit/delete/setDefault) is in-flight.
  final bool isBusy;

  /// Inline error from a failed mutation; null on success.
  final String? error;

  const AddressManagementLoaded({
    required this.addresses,
    this.isBusy = false,
    this.error,
  });

  AddressManagementLoaded copyWith({
    List<AddressModel>? addresses,
    bool? isBusy,
    String? error,
    bool clearError = false,
  }) {
    return AddressManagementLoaded(
      addresses: addresses ?? this.addresses,
      isBusy: isBusy ?? this.isBusy,
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props => [addresses, isBusy, error];
}

class AddressManagementError extends AddressManagementState {
  final String message;

  const AddressManagementError({required this.message});

  @override
  List<Object?> get props => [message];
}
