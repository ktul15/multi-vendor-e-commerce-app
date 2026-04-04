import 'package:equatable/equatable.dart';
import '../../../shared/models/vendor_profile.dart';

abstract class StoreState extends Equatable {
  const StoreState();

  @override
  List<Object?> get props => [];
}

class StoreInitial extends StoreState {}

class StoreLoading extends StoreState {}

class StoreLoaded extends StoreState {
  final VendorProfile profile;
  final bool isSaving;

  const StoreLoaded(this.profile, {this.isSaving = false});

  @override
  List<Object?> get props => [profile, isSaving];
}

class StoreError extends StoreState {
  final String message;

  const StoreError(this.message);

  @override
  List<Object?> get props => [message];
}

class StoreSaved extends StoreState {
  final VendorProfile profile;

  const StoreSaved(this.profile);

  @override
  List<Object?> get props => [profile];
}
