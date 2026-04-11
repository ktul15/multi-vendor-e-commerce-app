import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../../../repositories/admin_finance_repository.dart';
import 'finance_state.dart';

class FinanceCubit extends Cubit<FinanceState> {
  final AdminFinanceRepository _repository;

  FinanceCubit({required AdminFinanceRepository repository})
      : _repository = repository,
        super(const FinanceInitial());

  // ── Initial load ──────────────────────────────────────────────────────────

  Future<void> load() async {
    emit(const FinanceLoading());
    try {
      final (revenue, commission) = await (
        _repository.getRevenue(period: 'month'),
        _repository.getCommission(),
      ).wait;
      emit(FinanceLoaded(revenue: revenue, commission: commission));
    } on ApiException catch (e) {
      emit(FinanceError(e.message));
    } catch (_) {
      emit(const FinanceError('Something went wrong. Please try again.'));
    }
  }

  /// Loads only if not already loaded or loading.
  Future<void> ensureLoaded() async {
    if (state is FinanceLoaded || state is FinanceLoading) return;
    await load();
  }

  /// Reload the page with current settings.
  Future<void> refresh() => load();

  // ── Revenue controls ──────────────────────────────────────────────────────

  /// Switch the grouping period (day / week / month). No-op if unchanged
  /// or if a revenue fetch is already in flight.
  Future<void> changePeriod(String period) async {
    final current = state;
    if (current is! FinanceLoaded) return;
    if (current.selectedPeriod == period || current.isRevenueLoading) return;

    emit(current.copyWith(selectedPeriod: period, isRevenueLoading: true));
    await _fetchRevenue(
      period: period,
      startDate: current.startDate,
      endDate: current.endDate,
    );
  }

  /// Apply a custom date range. Validates ≤366 days before hitting the API.
  Future<void> applyDateRange(DateTime start, DateTime end) async {
    final current = state;
    if (current is! FinanceLoaded) return;

    const maxDays = 366;
    final diff = end.difference(start).inDays;
    if (diff > maxDays || start.isAfter(end)) {
      emit(current.copyWith(
        revenueError: diff > maxDays
            ? 'Date range cannot exceed $maxDays days'
            : 'Start date must be before end date',
      ));
      return;
    }

    emit(current.copyWith(isRevenueLoading: true));
    await _fetchRevenue(
      period: current.selectedPeriod,
      startDate: start,
      endDate: end,
      newStartDate: start,
      newEndDate: end,
    );
  }

  /// Remove the custom date range and reload with the default window.
  Future<void> clearDateRange() async {
    final current = state;
    if (current is! FinanceLoaded) return;
    if (current.startDate == null && current.endDate == null) return;

    emit(current.copyWith(isRevenueLoading: true));
    await _fetchRevenue(period: current.selectedPeriod);
  }

  // ── Commission ────────────────────────────────────────────────────────────

  /// Save a new platform-wide commission rate. No-op if already saving.
  Future<void> saveCommission(double rate) async {
    final current = state;
    if (current is! FinanceLoaded || current.isCommissionSaving) return;

    emit(current.copyWith(isCommissionSaving: true));
    try {
      final updated = await _repository.updateCommission(rate);

      final s = state;
      if (s is! FinanceLoaded) return;
      emit(s.copyWith(
        commission: updated,
        isCommissionSaving: false,
        commissionSuccess: 'Commission rate updated',
      ));
    } on ApiException catch (e) {
      final s = state;
      if (s is FinanceLoaded) {
        emit(s.copyWith(
            isCommissionSaving: false, commissionError: e.message));
      }
    } catch (_) {
      final s = state;
      if (s is FinanceLoaded) {
        emit(s.copyWith(
          isCommissionSaving: false,
          commissionError: 'Something went wrong. Please try again.',
        ));
      }
    }
  }

  void clearRevenueError() {
    final s = state;
    if (s is FinanceLoaded) emit(s.copyWith(clearRevenueError: true));
  }

  void clearCommissionError() {
    final s = state;
    if (s is FinanceLoaded) emit(s.copyWith(clearCommissionError: true));
  }

  void clearCommissionSuccess() {
    final s = state;
    if (s is FinanceLoaded) emit(s.copyWith(clearCommissionSuccess: true));
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  Future<void> _fetchRevenue({
    required String period,
    DateTime? startDate,
    DateTime? endDate,
    DateTime? newStartDate,
    DateTime? newEndDate,
  }) async {
    try {
      final revenue = await _repository.getRevenue(
        period: period,
        startDate: startDate,
        endDate: endDate,
      );

      final s = state;
      if (s is! FinanceLoaded) return;
      emit(s.copyWith(
        revenue: revenue,
        isRevenueLoading: false,
        startDate: newStartDate,
        clearStartDate: newStartDate == null,
        endDate: newEndDate,
        clearEndDate: newEndDate == null,
      ));
    } on ApiException catch (e) {
      final s = state;
      if (s is FinanceLoaded) {
        emit(s.copyWith(isRevenueLoading: false, revenueError: e.message));
      }
    } catch (_) {
      final s = state;
      if (s is FinanceLoaded) {
        emit(s.copyWith(
          isRevenueLoading: false,
          revenueError: 'Something went wrong. Please try again.',
        ));
      }
    }
  }
}
