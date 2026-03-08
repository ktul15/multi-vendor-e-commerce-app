import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../repositories/product_list_repository.dart';
import '../../../shared/models/product_filters.dart';
import 'product_list_state.dart';

class ProductListCubit extends Cubit<ProductListState> {
  final ProductListRepository _repository;

  static const int _pageSize = 20;

  ProductListCubit({required ProductListRepository repository})
      : _repository = repository,
        super(const ProductListInitial());

  /// Initial load with given filters (resets any existing products).
  Future<void> loadProducts({ProductFilters? filters}) async {
    final activeFilters = filters ?? const ProductFilters();
    emit(const ProductListLoading());
    try {
      final page = await _repository.getProducts(
        filters: activeFilters,
        page: 1,
        limit: _pageSize,
      );
      emit(ProductListLoaded(
        products: page.items,
        total: page.total,
        currentPage: page.page,
        totalPages: page.totalPages,
        filters: activeFilters,
      ));
    } on DioException catch (e) {
      final message = e.response?.data?['message'] as String? ??
          _friendlyMessage(e.type);
      emit(ProductListError(message: message, filters: activeFilters));
    } catch (e) {
      emit(ProductListError(
        message: e.toString(),
        filters: activeFilters,
      ));
    }
  }

  /// Append next page (infinite scroll). No-op if already loading or at end.
  Future<void> loadMore() async {
    final current = state;
    if (current is! ProductListLoaded) return;
    if (!current.hasMore || current.isLoadingMore) return;

    emit(current.copyWith(isLoadingMore: true));
    try {
      final page = await _repository.getProducts(
        filters: current.filters,
        page: current.currentPage + 1,
        limit: _pageSize,
      );
      emit(current.copyWith(
        products: [...current.products, ...page.items],
        currentPage: page.page,
        totalPages: page.totalPages,
        total: page.total,
        isLoadingMore: false,
      ));
    } on DioException {
      // On load-more failure, restore previous state without the loading flag
      emit(current.copyWith(isLoadingMore: false));
    } catch (_) {
      emit(current.copyWith(isLoadingMore: false));
    }
  }

  /// Apply new filters and reload from page 1.
  Future<void> applyFilters(ProductFilters filters) => loadProducts(filters: filters);

  /// Change sort and reload.
  Future<void> applySort(ProductSort sort) {
    final current = state;
    final currentFilters = current is ProductListLoaded
        ? current.filters
        : current is ProductListError
            ? current.filters
            : const ProductFilters();
    return loadProducts(filters: currentFilters.copyWith(sort: sort));
  }

  /// Toggle between grid and list view (no API call needed).
  void toggleViewMode() {
    final current = state;
    if (current is! ProductListLoaded) return;
    final next = current.viewMode == ProductListViewMode.grid
        ? ProductListViewMode.list
        : ProductListViewMode.grid;
    emit(current.copyWith(viewMode: next));
  }

  /// Pull-to-refresh: reload with the current filters.
  Future<void> refresh() {
    final current = state;
    final filters = current is ProductListLoaded
        ? current.filters
        : current is ProductListError
            ? current.filters
            : const ProductFilters();
    return loadProducts(filters: filters);
  }

  String _friendlyMessage(DioExceptionType type) => switch (type) {
        DioExceptionType.connectionTimeout ||
        DioExceptionType.receiveTimeout ||
        DioExceptionType.sendTimeout =>
          'Connection timed out. Check your internet and try again.',
        DioExceptionType.connectionError =>
          'No internet connection. Please try again.',
        _ => 'Something went wrong. Please try again.',
      };
}
