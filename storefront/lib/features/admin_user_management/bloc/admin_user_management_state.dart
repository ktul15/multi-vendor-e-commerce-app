import 'package:equatable/equatable.dart';
import '../models/admin_user_model.dart';
import '../models/user_list_meta_model.dart';

sealed class AdminUserManagementState extends Equatable {
  const AdminUserManagementState();

  @override
  List<Object?> get props => [];
}

class AdminUserManagementInitial extends AdminUserManagementState {
  const AdminUserManagementInitial();
}

class AdminUserManagementLoading extends AdminUserManagementState {
  const AdminUserManagementLoading();
}

class AdminUserManagementLoaded extends AdminUserManagementState {
  final List<AdminUserModel> items;
  final UserListMetaModel meta;
  final String searchQuery;
  final String? roleFilter;
  final bool isLoadingMore;
  // Each ban/unban call adds the userId here while the call is in-flight.
  // Always create a new Set instance in copyWith so Equatable detects the change.
  final Set<String> banningUserIds;
  // Transient error shown as a snackbar (ban/unban failures, load-more failures).
  // Cleared via clearTransientError(); non-null only momentarily.
  final String? transientError;

  const AdminUserManagementLoaded({
    required this.items,
    required this.meta,
    this.searchQuery = '',
    this.roleFilter,
    this.isLoadingMore = false,
    this.banningUserIds = const {},
    this.transientError,
  });

  bool get hasMorePages => meta.page < meta.totalPages;

  AdminUserManagementLoaded copyWith({
    List<AdminUserModel>? items,
    UserListMetaModel? meta,
    String? searchQuery,
    String? roleFilter,
    bool? isLoadingMore,
    Set<String>? banningUserIds,
    String? transientError,
    bool clearRoleFilter = false,
    bool clearTransientError = false,
  }) {
    return AdminUserManagementLoaded(
      items: items ?? this.items,
      meta: meta ?? this.meta,
      searchQuery: searchQuery ?? this.searchQuery,
      roleFilter: clearRoleFilter ? null : (roleFilter ?? this.roleFilter),
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      // Always wrap in Set.from to produce a new instance for Equatable.
      banningUserIds: Set.from(banningUserIds ?? this.banningUserIds),
      transientError:
          clearTransientError ? null : (transientError ?? this.transientError),
    );
  }

  @override
  List<Object?> get props => [
        items,
        meta,
        searchQuery,
        roleFilter,
        isLoadingMore,
        // Use toList() so Equatable compares contents, not set identity.
        banningUserIds.toList()..sort(),
        transientError,
      ];
}

class AdminUserManagementError extends AdminUserManagementState {
  final String message;

  const AdminUserManagementError(this.message);

  @override
  List<Object?> get props => [message];
}
