import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
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
      // Run all three requests concurrently
      final results = await (
        _repository.getCategories(),
        _repository.getTrendingProducts(),
        _repository.getNewArrivals(),
      ).wait;

      emit(
        HomeLoaded(
          categories: results.$1,
          trendingProducts: results.$2,
          newArrivals: results.$3,
        ),
      );
    } on DioException catch (e) {
      final message = e.response?.data?['message'] as String? ??
          _friendlyDioMessage(e.type);
      emit(HomeError(message));
    } on HomeDataException catch (e) {
      emit(HomeError(e.toString()));
    } catch (_) {
      emit(const HomeError('Something went wrong. Please try again.'));
    }
  }

  Future<void> refresh() => loadHome();

  String _friendlyDioMessage(DioExceptionType type) {
    return switch (type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.receiveTimeout ||
      DioExceptionType.sendTimeout =>
        'Connection timed out. Check your internet and try again.',
      DioExceptionType.connectionError =>
        'No internet connection. Please try again.',
      _ => 'Something went wrong. Please try again.',
    };
  }
}
