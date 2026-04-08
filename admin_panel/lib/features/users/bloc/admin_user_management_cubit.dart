import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../../../repositories/admin_user_repository.dart';
import '../models/admin_user_model.dart';
import 'admin_user_management_state.dart';

class AdminUserManagementCubit extends Cubit<AdminUserManagementState> {
  final AdminUserRepository _repository;

  AdminUserManagementCubit({required AdminUserRepository repository})
      : _repository = repository,
        super(const AdminUserManagementInitial());

  /// Skips the network call when data is already loaded (e.g. navigating back).
  /// The router calls this so the lazySingleton cubit doesn't refetch on every visit.
  /// Also calls load() if the previous attempt errored, which gives the user
  /// a retry on re-entering the screen. Only the Loaded state is skipped.
  void ensureLoaded() {
    if (state is AdminUserManagementLoaded) return;
    load();
  }

  Future<void> load() async {
    emit(const AdminUserManagementLoading());
    try {
      final result = await _repository.listUsers(page: 1, limit: 15);
      emit(AdminUserManagementLoaded(
        items: result.items,
        meta: result.meta,
      ));
    } on ApiException catch (e) {
      emit(AdminUserManagementError(e.message));
    } catch (_) {
      emit(const AdminUserManagementError(
          'Something went wrong. Please try again.'));
    }
  }

  // Called by the view after debounce — resets to page 1 with the new query.
  // On failure: keeps current items visible and surfaces error as a snackbar.
  Future<void> search(String query) async {
    final current = state;
    if (current is! AdminUserManagementLoaded) return;

    emit(current.copyWith(isSearching: true));
    try {
      final result = await _repository.listUsers(
        page: 1,
        limit: 15,
        role: current.roleFilter,
        search: query,
      );
      // Guard: discard result if state changed while the call was in flight.
      final s = state;
      if (s is! AdminUserManagementLoaded) return;
      emit(s.copyWith(
        items: result.items,
        meta: result.meta,
        searchQuery: query,
        isSearching: false,
      ));
    } on ApiException catch (e) {
      final s = state;
      if (s is AdminUserManagementLoaded) {
        emit(s.copyWith(isSearching: false, transientError: e.message));
      }
    } catch (_) {
      final s = state;
      if (s is AdminUserManagementLoaded) {
        emit(s.copyWith(
          isSearching: false,
          transientError: 'Search failed. Please try again.',
        ));
      }
    }
  }

  // Called when a role chip is tapped — null means "All".
  // On failure: keeps current items visible and surfaces error as a snackbar.
  Future<void> filterByRole(String? role) async {
    final current = state;
    if (current is! AdminUserManagementLoaded) return;
    if (current.roleFilter == role) return;

    emit(current.copyWith(isSearching: true));
    try {
      final result = await _repository.listUsers(
        page: 1,
        limit: 15,
        role: role,
        search: current.searchQuery.isNotEmpty ? current.searchQuery : null,
      );
      final s = state;
      if (s is! AdminUserManagementLoaded) return;
      emit(s.copyWith(
        items: result.items,
        meta: result.meta,
        roleFilter: role,
        clearRoleFilter: role == null,
        isSearching: false,
      ));
    } on ApiException catch (e) {
      final s = state;
      if (s is AdminUserManagementLoaded) {
        emit(s.copyWith(isSearching: false, transientError: e.message));
      }
    } catch (_) {
      final s = state;
      if (s is AdminUserManagementLoaded) {
        emit(s.copyWith(
          isSearching: false,
          transientError: 'Filter failed. Please try again.',
        ));
      }
    }
  }

  // Called by the scroll listener when near the bottom.
  Future<void> loadMore() async {
    final current = state;
    if (current is! AdminUserManagementLoaded) return;
    if (current.isLoadingMore || !current.hasMorePages) return;

    emit(current.copyWith(isLoadingMore: true));
    try {
      final result = await _repository.listUsers(
        page: current.meta.page + 1,
        limit: 15,
        role: current.roleFilter,
        search: current.searchQuery.isNotEmpty ? current.searchQuery : null,
      );
      final updated = state;
      if (updated is! AdminUserManagementLoaded) return;
      emit(updated.copyWith(
        items: [...updated.items, ...result.items],
        meta: result.meta,
        isLoadingMore: false,
      ));
    } on ApiException catch (e) {
      final s = state;
      if (s is AdminUserManagementLoaded) {
        emit(s.copyWith(isLoadingMore: false, transientError: e.message));
      }
    } catch (_) {
      final s = state;
      if (s is AdminUserManagementLoaded) {
        emit(s.copyWith(
          isLoadingMore: false,
          transientError: 'Failed to load more users',
        ));
      }
    }
  }

  // Called after the confirmation dialog is confirmed.
  Future<void> toggleBan(AdminUserModel user) async {
    // Belt-and-suspenders: admins cannot be banned from the UI.
    if (user.role == 'ADMIN') return;

    final current = state;
    if (current is! AdminUserManagementLoaded) return;
    if (current.banningUserIds.contains(user.id)) return;

    emit(current.copyWith(
      banningUserIds: {...current.banningUserIds, user.id},
    ));

    try {
      if (user.isBanned) {
        await _repository.unbanUser(user.id);
      } else {
        await _repository.banUser(user.id);
      }

      final updated = state;
      if (updated is! AdminUserManagementLoaded) return;

      // Derive the new isBanned from the live item (u), not the snapshot (user),
      // to guard against a concurrent refresh replacing the item between dispatch
      // and response.
      final newItems = updated.items.map((u) {
        return u.id == user.id ? u.copyWith(isBanned: !u.isBanned) : u;
      }).toList();

      final newBanning = Set<String>.from(updated.banningUserIds)
        ..remove(user.id);

      emit(updated.copyWith(
        items: newItems,
        banningUserIds: newBanning,
      ));
    } on ApiException catch (e) {
      final s = state;
      if (s is AdminUserManagementLoaded) {
        final newBanning = Set<String>.from(s.banningUserIds)..remove(user.id);
        emit(s.copyWith(banningUserIds: newBanning, transientError: e.message));
      }
    } catch (_) {
      final s = state;
      if (s is AdminUserManagementLoaded) {
        final newBanning = Set<String>.from(s.banningUserIds)..remove(user.id);
        emit(s.copyWith(
          banningUserIds: newBanning,
          transientError: 'Failed to update user status',
        ));
      }
    }
  }

  void clearTransientError() {
    final current = state;
    if (current is AdminUserManagementLoaded) {
      emit(current.copyWith(clearTransientError: true));
    }
  }

  Future<void> refresh() => load();
}
