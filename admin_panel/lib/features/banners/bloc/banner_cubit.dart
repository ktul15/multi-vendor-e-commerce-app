import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../../../repositories/banner_repository.dart';
import 'banner_state.dart';

class BannerCubit extends Cubit<BannerState> {
  final BannerRepository _repository;

  BannerCubit({required BannerRepository repository})
      : _repository = repository,
        super(const BannerInitial());

  // ── Initial load ──────────────────────────────────────────────────────────

  Future<void> load() async {
    emit(const BannerLoading());
    try {
      final result = await _repository.listBanners(
        page: 1,
        limit: BannerLoaded.pageLimit,
      );
      emit(BannerLoaded(items: result.items, meta: result.meta));
    } on ApiException catch (e) {
      emit(BannerError(e.message));
    } catch (_) {
      emit(const BannerError('Something went wrong. Please try again.'));
    }
  }

  /// Loads only if not already loaded or loading. Safe to call on every route rebuild.
  Future<void> ensureLoaded() async {
    if (state is BannerLoaded || state is BannerLoading) return;
    await load();
  }

  // ── Filter / page ──────────────────────────────────────────────────────────

  Future<String?> filterByActive(bool? isActive) async {
    final current = state;
    if (current is! BannerLoaded) return null;
    if (current.isActiveFilter == isActive) return null;
    return _fetchPage(
      page: 1,
      isActive: isActive,
      newIsActiveFilter: isActive,
    );
  }

  Future<String?> nextPage() async {
    final current = state;
    if (current is! BannerLoaded || !current.hasNextPage) return null;
    return _fetchPage(
      page: current.meta.page + 1,
      isActive: current.isActiveFilter,
      newIsActiveFilter: current.isActiveFilter,
    );
  }

  Future<String?> prevPage() async {
    final current = state;
    if (current is! BannerLoaded || !current.hasPrevPage) return null;
    return _fetchPage(
      page: current.meta.page - 1,
      isActive: current.isActiveFilter,
      newIsActiveFilter: current.isActiveFilter,
    );
  }

  Future<void> refresh() async {
    final current = state;
    if (current is BannerLoaded) {
      await _fetchPage(
        page: current.meta.page,
        isActive: current.isActiveFilter,
        newIsActiveFilter: current.isActiveFilter,
      );
    } else {
      await load();
    }
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  /// Creates a banner. Returns null on success, error message on failure.
  Future<String?> createBanner({
    required String title,
    required String imagePath,
    String? linkUrl,
    int position = 0,
    bool isActive = true,
  }) async {
    final current = state;
    if (current is! BannerLoaded) return null;
    emit(current.copyWith(isSubmitting: true));
    try {
      await _repository.createBanner(
        title: title,
        imagePath: imagePath,
        linkUrl: linkUrl,
        position: position,
        isActive: isActive,
      );
      await _silentRefresh(current);
      return null;
    } on ApiException catch (e) {
      final s = state;
      if (s is BannerLoaded) emit(s.copyWith(isSubmitting: false));
      return e.message;
    } catch (_) {
      final s = state;
      if (s is BannerLoaded) emit(s.copyWith(isSubmitting: false));
      return 'Something went wrong. Please try again.';
    }
  }

  /// Updates a banner. Returns null on success, error message on failure.
  Future<String?> updateBanner(
    String id, {
    String? title,
    String? imagePath,
    String? linkUrl,
    bool clearLinkUrl = false,
    int? position,
    bool? isActive,
  }) async {
    final current = state;
    if (current is! BannerLoaded) return null;
    emit(current.copyWith(isSubmitting: true));
    try {
      await _repository.updateBanner(
        id,
        title: title,
        imagePath: imagePath,
        linkUrl: linkUrl,
        clearLinkUrl: clearLinkUrl,
        position: position,
        isActive: isActive,
      );
      await _silentRefresh(current);
      return null;
    } on ApiException catch (e) {
      final s = state;
      if (s is BannerLoaded) emit(s.copyWith(isSubmitting: false));
      return e.message;
    } catch (_) {
      final s = state;
      if (s is BannerLoaded) emit(s.copyWith(isSubmitting: false));
      return 'Something went wrong. Please try again.';
    }
  }

  /// Deletes a banner. Returns null on success, error message on failure.
  Future<String?> deleteBanner(String id) async {
    final current = state;
    if (current is! BannerLoaded) return null;
    emit(current.copyWith(isSubmitting: true));
    try {
      await _repository.deleteBanner(id);
      await _silentRefresh(current);
      return null;
    } on ApiException catch (e) {
      final s = state;
      if (s is BannerLoaded) emit(s.copyWith(isSubmitting: false));
      return e.message;
    } catch (_) {
      final s = state;
      if (s is BannerLoaded) emit(s.copyWith(isSubmitting: false));
      return 'Something went wrong. Please try again.';
    }
  }

  /// Reorders banners by updating position for each item whose position changed.
  /// [oldIndex] and [newIndex] are the visual list indices before/after the drag.
  Future<String?> reorder(int oldIndex, int newIndex) async {
    final current = state;
    if (current is! BannerLoaded) return null;

    // Optimistically reorder the local list.
    final reordered = current.items.toList();
    final moved = reordered.removeAt(oldIndex);
    reordered.insert(newIndex, moved);

    // Emit optimistic update immediately so the UI feels responsive.
    emit(current.copyWith(
      items: reordered,
      isSubmitting: true,
    ));

    // Send PUT requests for each item whose position changed.
    String? firstError;
    for (var i = 0; i < reordered.length; i++) {
      if (reordered[i].position != i) {
        try {
          await _repository.updateBanner(reordered[i].id, position: i);
        } on ApiException catch (e) {
          firstError ??= e.message;
        } catch (_) {
          firstError ??= 'Failed to save new order. Please try again.';
        }
      }
    }

    // Always refresh to get the authoritative order from the backend.
    // This reverts the optimistic state if any PUT failed, so the UI
    // always reflects the real server state regardless of firstError.
    await _silentRefresh(current);
    return firstError;
  }

  void clearTransientError() {
    final current = state;
    if (current is BannerLoaded) {
      emit(current.copyWith(clearTransientError: true));
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  Future<String?> _fetchPage({
    required int page,
    required bool? isActive,
    required bool? newIsActiveFilter,
  }) async {
    final current = state;
    if (current is! BannerLoaded) return null;

    emit(current.copyWith(isRefreshing: true));
    try {
      final result = await _repository.listBanners(
        page: page,
        limit: BannerLoaded.pageLimit,
        isActive: isActive,
      );

      // Stale-state guard.
      final s = state;
      if (s is! BannerLoaded) return null;

      emit(s.copyWith(
        items: result.items,
        meta: result.meta,
        isActiveFilter: newIsActiveFilter,
        clearIsActiveFilter: newIsActiveFilter == null,
        isRefreshing: false,
      ));
      return null;
    } on ApiException catch (e) {
      final s = state;
      if (s is BannerLoaded) emit(s.copyWith(isRefreshing: false));
      return e.message;
    } catch (_) {
      final s = state;
      if (s is BannerLoaded) emit(s.copyWith(isRefreshing: false));
      return 'Something went wrong. Please try again.';
    }
  }

  Future<void> _silentRefresh(BannerLoaded previous) async {
    try {
      final result = await _repository.listBanners(
        page: previous.meta.page,
        limit: BannerLoaded.pageLimit,
        isActive: previous.isActiveFilter,
      );
      final s = state;
      if (s is BannerLoaded) {
        emit(s.copyWith(
          items: result.items,
          meta: result.meta,
          isSubmitting: false,
        ));
      }
    } on ApiException catch (e) {
      final s = state;
      if (s is BannerLoaded) {
        emit(s.copyWith(isSubmitting: false, transientError: e.message));
      }
    } catch (_) {
      final s = state;
      if (s is BannerLoaded) {
        emit(s.copyWith(
          isSubmitting: false,
          transientError: 'Something went wrong. Please try again.',
        ));
      }
    }
  }
}
