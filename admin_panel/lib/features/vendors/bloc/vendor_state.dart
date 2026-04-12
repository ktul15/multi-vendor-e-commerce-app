import 'package:equatable/equatable.dart';
import '../models/vendor_model.dart';

sealed class VendorState extends Equatable {
  const VendorState();

  @override
  List<Object?> get props => [];
}

class VendorInitial extends VendorState {
  const VendorInitial();
}

class VendorLoading extends VendorState {
  const VendorLoading();
}

class VendorLoaded extends VendorState {
  static const int pageLimit = 15;

  final List<VendorModel> items;
  final int total;
  final int page;
  final int totalPages;
  final String searchQuery;
  final String? statusFilter;
  // True while a page-change / search / filter fetch is in flight.
  // Keeps the existing table visible with a loading overlay instead of
  // replacing the whole screen with a spinner.
  final bool isRefreshing;
  // IDs of vendors with an in-flight approve/reject/suspend call.
  final Set<String> actioningIds;

  const VendorLoaded({
    required this.items,
    required this.total,
    required this.page,
    required this.totalPages,
    this.searchQuery = '',
    this.statusFilter,
    this.isRefreshing = false,
    this.actioningIds = const {},
  });

  bool get hasNextPage => page < totalPages;
  bool get hasPrevPage => page > 1;

  int get fromItem => total == 0 ? 0 : ((page - 1) * pageLimit) + 1;
  int get toItem => total == 0 ? 0 : (page * pageLimit).clamp(0, total);

  VendorLoaded copyWith({
    List<VendorModel>? items,
    int? total,
    int? page,
    int? totalPages,
    String? searchQuery,
    String? statusFilter,
    bool? isRefreshing,
    Set<String>? actioningIds,
    bool clearStatusFilter = false,
  }) {
    return VendorLoaded(
      items: items ?? this.items,
      total: total ?? this.total,
      page: page ?? this.page,
      totalPages: totalPages ?? this.totalPages,
      searchQuery: searchQuery ?? this.searchQuery,
      statusFilter:
          clearStatusFilter ? null : (statusFilter ?? this.statusFilter),
      isRefreshing: isRefreshing ?? this.isRefreshing,
      // Always wrap in Set.from so Equatable detects the change.
      actioningIds: Set.from(actioningIds ?? this.actioningIds),
    );
  }

  @override
  List<Object?> get props => [
        items,
        total,
        page,
        totalPages,
        searchQuery,
        statusFilter,
        isRefreshing,
        // toList()..sort() so Equatable compares contents, not set identity.
        actioningIds.toList()..sort(),
      ];
}

class VendorError extends VendorState {
  final String message;

  const VendorError(this.message);

  @override
  List<Object?> get props => [message];
}
