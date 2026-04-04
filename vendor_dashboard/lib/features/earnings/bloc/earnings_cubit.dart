import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../repositories/analytics_repository.dart';
import 'earnings_state.dart';

class EarningsCubit extends Cubit<EarningsState> {
  final AnalyticsRepository _analyticsRepository;

  EarningsCubit({required AnalyticsRepository analyticsRepository})
      : _analyticsRepository = analyticsRepository,
        super(EarningsInitial());

  Future<void> load({String period = 'day'}) async {
    emit(EarningsLoading());
    try {
      final (summary, salesData, topProducts) = await (
        _analyticsRepository.getSummary(),
        _analyticsRepository.getSales(period: period),
        _analyticsRepository.getTopProducts(limit: 10),
      ).wait;

      emit(EarningsLoaded(
        summary: summary,
        salesData: salesData,
        period: period,
        topProducts: topProducts,
      ));
    } catch (e) {
      emit(EarningsError(e.toString()));
    }
  }
}
