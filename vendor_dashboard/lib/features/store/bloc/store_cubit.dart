import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../repositories/vendor_profile_repository.dart';
import 'store_state.dart';

class StoreCubit extends Cubit<StoreState> {
  final VendorProfileRepository _profileRepository;

  StoreCubit({required VendorProfileRepository profileRepository})
      : _profileRepository = profileRepository,
        super(StoreInitial());

  Future<void> load() async {
    emit(StoreLoading());
    try {
      final profile = await _profileRepository.getProfile();
      emit(StoreLoaded(profile));
    } catch (e) {
      emit(StoreError(e.toString()));
    }
  }

  Future<void> save({String? storeName, String? description}) async {
    final current = state;
    if (current is! StoreLoaded) return;
    emit(StoreLoaded(current.profile, isSaving: true));
    try {
      final updated = await _profileRepository.updateProfile(
        storeName: storeName,
        description: description,
      );
      // Emit StoreSaved so the UI can show a success snackbar, then immediately
      // transition to StoreLoaded with fresh data — no redundant load() call needed.
      emit(StoreSaved(updated));
      emit(StoreLoaded(updated));
    } catch (e) {
      emit(StoreError(e.toString()));
    }
  }
}
