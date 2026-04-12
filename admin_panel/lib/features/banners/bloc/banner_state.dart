import 'package:equatable/equatable.dart';
import '../models/banner_model.dart';
import '../../../features/users/models/user_list_meta_model.dart';

sealed class BannerState extends Equatable {
  const BannerState();

  @override
  List<Object?> get props => [];
}

class BannerInitial extends BannerState {
  const BannerInitial();
}

class BannerLoading extends BannerState {
  const BannerLoading();
}

/// Banners loaded successfully.
/// [isRefreshing] is true while a page-change or filter fetch is in flight.
/// [isSubmitting] is true while a create/update/delete/reorder is in flight.
/// [transientError] is non-null momentarily after a mutation fails.
class BannerLoaded extends BannerState {
  static const int pageLimit = 20;

  final List<BannerModel> items;
  final UserListMetaModel meta;
  final bool? isActiveFilter;
  final bool isRefreshing;
  final bool isSubmitting;
  final String? transientError;

  const BannerLoaded({
    required this.items,
    required this.meta,
    this.isActiveFilter,
    this.isRefreshing = false,
    this.isSubmitting = false,
    this.transientError,
  });

  bool get hasNextPage => meta.page < meta.totalPages;
  bool get hasPrevPage => meta.page > 1;

  int get fromItem =>
      meta.total == 0 ? 0 : ((meta.page - 1) * pageLimit) + 1;
  int get toItem =>
      meta.total == 0 ? 0 : (meta.page * meta.limit).clamp(0, meta.total);

  BannerLoaded copyWith({
    List<BannerModel>? items,
    UserListMetaModel? meta,
    bool? isActiveFilter,
    bool? isRefreshing,
    bool? isSubmitting,
    String? transientError,
    bool clearIsActiveFilter = false,
    bool clearTransientError = false,
  }) {
    return BannerLoaded(
      items: items ?? this.items,
      meta: meta ?? this.meta,
      isActiveFilter:
          clearIsActiveFilter ? null : (isActiveFilter ?? this.isActiveFilter),
      isRefreshing: isRefreshing ?? this.isRefreshing,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      transientError:
          clearTransientError ? null : (transientError ?? this.transientError),
    );
  }

  @override
  List<Object?> get props =>
      [items, meta, isActiveFilter, isRefreshing, isSubmitting, transientError];
}

class BannerError extends BannerState {
  final String message;

  const BannerError(this.message);

  @override
  List<Object?> get props => [message];
}
