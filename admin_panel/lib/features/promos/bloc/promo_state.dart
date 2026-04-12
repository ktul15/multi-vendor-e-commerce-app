import 'package:equatable/equatable.dart';
import '../models/promo_model.dart';
import '../../../features/users/models/user_list_meta_model.dart';

sealed class PromoState extends Equatable {
  const PromoState();

  @override
  List<Object?> get props => [];
}

class PromoInitial extends PromoState {
  const PromoInitial();
}

class PromoLoading extends PromoState {
  const PromoLoading();
}

/// Promo codes loaded successfully.
/// [isRefreshing] is true while a page-change or filter fetch is in flight.
/// [isSubmitting] is true while a create/update/delete is in flight.
class PromoLoaded extends PromoState {
  static const int pageLimit = 20;

  final List<PromoModel> items;
  final UserListMetaModel meta;
  final bool? isActiveFilter;
  final String? searchQuery;
  final String? discountTypeFilter;
  final bool isRefreshing;
  final bool isSubmitting;
  final String? transientError;

  const PromoLoaded({
    required this.items,
    required this.meta,
    this.isActiveFilter,
    this.searchQuery,
    this.discountTypeFilter,
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

  PromoLoaded copyWith({
    List<PromoModel>? items,
    UserListMetaModel? meta,
    bool? isActiveFilter,
    String? searchQuery,
    String? discountTypeFilter,
    bool? isRefreshing,
    bool? isSubmitting,
    String? transientError,
    bool clearIsActiveFilter = false,
    bool clearSearchQuery = false,
    bool clearDiscountTypeFilter = false,
    bool clearTransientError = false,
  }) {
    return PromoLoaded(
      items: items ?? this.items,
      meta: meta ?? this.meta,
      isActiveFilter:
          clearIsActiveFilter ? null : (isActiveFilter ?? this.isActiveFilter),
      searchQuery:
          clearSearchQuery ? null : (searchQuery ?? this.searchQuery),
      discountTypeFilter: clearDiscountTypeFilter
          ? null
          : (discountTypeFilter ?? this.discountTypeFilter),
      isRefreshing: isRefreshing ?? this.isRefreshing,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      transientError:
          clearTransientError ? null : (transientError ?? this.transientError),
    );
  }

  @override
  List<Object?> get props => [
        items,
        meta,
        isActiveFilter,
        searchQuery,
        discountTypeFilter,
        isRefreshing,
        isSubmitting,
        transientError,
      ];
}

class PromoError extends PromoState {
  final String message;

  const PromoError(this.message);

  @override
  List<Object?> get props => [message];
}
