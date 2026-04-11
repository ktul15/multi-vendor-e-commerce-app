import 'package:equatable/equatable.dart';
import '../../../features/dashboard/models/admin_order_model.dart';
import '../../../features/users/models/user_list_meta_model.dart';
import '../models/admin_order_detail_model.dart';

sealed class AdminOrderState extends Equatable {
  const AdminOrderState();

  @override
  List<Object?> get props => [];
}

class AdminOrderInitial extends AdminOrderState {
  const AdminOrderInitial();
}

class AdminOrderLoading extends AdminOrderState {
  const AdminOrderLoading();
}

class AdminOrderLoaded extends AdminOrderState {
  static const int pageLimit = 20;

  final List<AdminOrderModel> items;
  final UserListMetaModel meta;
  final String? statusFilter;
  final DateTime? startDate;
  final DateTime? endDate;
  // True while a page-change / filter / date-range fetch is in flight.
  // Keeps the existing table visible with a thin progress bar overlay.
  final bool isRefreshing;
  // Transient error shown as a snackbar (filter/page failures).
  // Cleared via clearTransientError(); non-null only momentarily.
  final String? transientError;

  // ── Detail sub-state ──────────────────────────────────────────────────────
  // The detail view shares this cubit via BlocProvider.value in the router.
  // Fetching is triggered by OrderDetailPage.initState → loadOrderDetail().
  final AdminOrderDetailModel? selectedOrderDetail;
  final bool isDetailLoading;
  final String? detailError;

  const AdminOrderLoaded({
    required this.items,
    required this.meta,
    this.statusFilter,
    this.startDate,
    this.endDate,
    this.isRefreshing = false,
    this.transientError,
    this.selectedOrderDetail,
    this.isDetailLoading = false,
    this.detailError,
  });

  bool get hasNextPage => meta.page < meta.totalPages;
  bool get hasPrevPage => meta.page > 1;

  int get fromItem =>
      meta.total == 0 ? 0 : ((meta.page - 1) * pageLimit) + 1;
  int get toItem =>
      meta.total == 0 ? 0 : (meta.page * pageLimit).clamp(0, meta.total);

  AdminOrderLoaded copyWith({
    List<AdminOrderModel>? items,
    UserListMetaModel? meta,
    String? statusFilter,
    DateTime? startDate,
    DateTime? endDate,
    bool? isRefreshing,
    String? transientError,
    AdminOrderDetailModel? selectedOrderDetail,
    bool? isDetailLoading,
    String? detailError,
    bool clearStatusFilter = false,
    bool clearStartDate = false,
    bool clearEndDate = false,
    bool clearTransientError = false,
    bool clearSelectedOrderDetail = false,
    bool clearDetailError = false,
  }) {
    return AdminOrderLoaded(
      items: items ?? this.items,
      meta: meta ?? this.meta,
      statusFilter:
          clearStatusFilter ? null : (statusFilter ?? this.statusFilter),
      startDate: clearStartDate ? null : (startDate ?? this.startDate),
      endDate: clearEndDate ? null : (endDate ?? this.endDate),
      isRefreshing: isRefreshing ?? this.isRefreshing,
      transientError:
          clearTransientError ? null : (transientError ?? this.transientError),
      selectedOrderDetail: clearSelectedOrderDetail
          ? null
          : (selectedOrderDetail ?? this.selectedOrderDetail),
      isDetailLoading: isDetailLoading ?? this.isDetailLoading,
      detailError:
          clearDetailError ? null : (detailError ?? this.detailError),
    );
  }

  @override
  List<Object?> get props => [
        items,
        meta,
        statusFilter,
        startDate,
        endDate,
        isRefreshing,
        transientError,
        selectedOrderDetail,
        isDetailLoading,
        detailError,
      ];
}

class AdminOrderError extends AdminOrderState {
  final String message;

  const AdminOrderError(this.message);

  @override
  List<Object?> get props => [message];
}
