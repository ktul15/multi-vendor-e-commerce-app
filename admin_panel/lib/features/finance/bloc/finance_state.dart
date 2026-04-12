import 'package:equatable/equatable.dart';
import '../../../features/dashboard/models/revenue_model.dart';
import '../models/commission_model.dart';

sealed class FinanceState extends Equatable {
  const FinanceState();

  @override
  List<Object?> get props => [];
}

class FinanceInitial extends FinanceState {
  const FinanceInitial();
}

class FinanceLoading extends FinanceState {
  const FinanceLoading();
}

class FinanceLoaded extends FinanceState {
  final RevenueModel revenue;
  final CommissionModel commission;
  final String selectedPeriod;
  final DateTime? startDate;
  final DateTime? endDate;
  // True while a period-change / date-range fetch is in flight.
  final bool isRevenueLoading;
  // True while the PATCH /commission call is in flight.
  final bool isCommissionSaving;
  // Transient error messages — shown as snackbars, cleared after display.
  final String? revenueError;
  final String? commissionError;
  final String? commissionSuccess;

  const FinanceLoaded({
    required this.revenue,
    required this.commission,
    this.selectedPeriod = 'month',
    this.startDate,
    this.endDate,
    this.isRevenueLoading = false,
    this.isCommissionSaving = false,
    this.revenueError,
    this.commissionError,
    this.commissionSuccess,
  });

  FinanceLoaded copyWith({
    RevenueModel? revenue,
    CommissionModel? commission,
    String? selectedPeriod,
    DateTime? startDate,
    DateTime? endDate,
    bool? isRevenueLoading,
    bool? isCommissionSaving,
    String? revenueError,
    String? commissionError,
    String? commissionSuccess,
    bool clearStartDate = false,
    bool clearEndDate = false,
    bool clearRevenueError = false,
    bool clearCommissionError = false,
    bool clearCommissionSuccess = false,
  }) {
    return FinanceLoaded(
      revenue: revenue ?? this.revenue,
      commission: commission ?? this.commission,
      selectedPeriod: selectedPeriod ?? this.selectedPeriod,
      startDate: clearStartDate ? null : (startDate ?? this.startDate),
      endDate: clearEndDate ? null : (endDate ?? this.endDate),
      isRevenueLoading: isRevenueLoading ?? this.isRevenueLoading,
      isCommissionSaving: isCommissionSaving ?? this.isCommissionSaving,
      revenueError:
          clearRevenueError ? null : (revenueError ?? this.revenueError),
      commissionError:
          clearCommissionError ? null : (commissionError ?? this.commissionError),
      commissionSuccess: clearCommissionSuccess
          ? null
          : (commissionSuccess ?? this.commissionSuccess),
    );
  }

  @override
  List<Object?> get props => [
        revenue,
        commission,
        selectedPeriod,
        startDate,
        endDate,
        isRevenueLoading,
        isCommissionSaving,
        revenueError,
        commissionError,
        commissionSuccess,
      ];
}

class FinanceError extends FinanceState {
  final String message;

  const FinanceError(this.message);

  @override
  List<Object?> get props => [message];
}
