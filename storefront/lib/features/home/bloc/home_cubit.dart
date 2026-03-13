import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../../../repositories/home_repository.dart';
import 'home_state.dart';

class HomeCubit extends Cubit<HomeState> {
  final HomeRepository _repository;

  HomeCubit({required HomeRepository repository})
    : _repository = repository,
      super(const HomeInitial());

  Future<void> loadHome() async {
    emit(const HomeLoading());
    try {
      final results = await (
        _repository.getCategories(),
        _repository.getTrendingProducts(),
        _repository.getNewArrivals(),
      ).wait;

      emit(HomeLoaded(
        categories: results.$1,
        trendingProducts: results.$2,
        newArrivals: results.$3,
      ));
    } on ApiException catch (e) {
      emit(HomeError(e.message));
    } on NetworkException catch (e) {
      emit(HomeError(e.message));
    } catch (_) {
      emit(const HomeError('Something went wrong. Please try again.'));
    }
  }

  Future<void> refresh() => loadHome();
}
