import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/storage/recent_searches_storage.dart';
import '../../../repositories/search_repository.dart';
import 'search_state.dart';

class SearchCubit extends Cubit<SearchState> {
  final SearchRepository _repository;
  final RecentSearchesStorage _storage;

  Timer? _debounce;

  /// Incremented on every new search and on clear(). Any in-flight request
  /// whose generation no longer matches the current value is discarded,
  /// preventing stale results from overwriting newer ones.
  int _generation = 0;

  static const _debounceMs = 500;
  static const _pageSize = 20;

  SearchCubit({
    required SearchRepository repository,
    required RecentSearchesStorage storage,
  })  : _repository = repository,
        _storage = storage,
        super(const SearchIdle());

  /// Load persisted recent searches on screen open.
  Future<void> init() async {
    final recent = await _storage.load();
    emit(SearchIdle(recentSearches: recent));
  }

  /// Called on every keystroke. Starts a debounce timer; the actual network
  /// request fires [_debounceMs] after the last call.
  void search(String query) {
    _debounce?.cancel();
    if (query.trim().isEmpty) {
      clear();
      return;
    }
    _debounce = Timer(
      const Duration(milliseconds: _debounceMs),
      () => _executeSearch(query.trim()),
    );
  }

  Future<void> _executeSearch(String query) async {
    final gen = ++_generation;
    final current = state;
    emit(SearchLoading(query: query, recentSearches: current.recentSearches));

    // Persist the query AFTER the debounce fires (not on every keystroke).
    final recentSearches = await _storage.add(query);

    try {
      final page = await _repository.searchProducts(
        query: query,
        page: 1,
        limit: _pageSize,
      );
      if (gen != _generation) return; // superseded by a newer search or clear
      emit(SearchLoaded(
        query: query,
        products: page.items,
        total: page.total,
        currentPage: page.page,
        totalPages: page.totalPages,
        recentSearches: recentSearches,
      ));
    } on ApiException catch (e) {
      if (gen != _generation) return;
      emit(SearchError(
          query: query, message: e.message, recentSearches: recentSearches));
    } on NetworkException catch (e) {
      if (gen != _generation) return;
      emit(SearchError(
          query: query, message: e.message, recentSearches: recentSearches));
    } catch (e) {
      if (gen != _generation) return;
      emit(SearchError(
          query: query,
          message: e.toString(),
          recentSearches: recentSearches));
    }
  }

  /// Append the next page of results (infinite scroll).
  Future<void> loadMore() async {
    final current = state;
    if (current is! SearchLoaded || !current.hasMore || current.isLoadingMore) {
      return;
    }
    emit(current.copyWith(isLoadingMore: true));
    try {
      final page = await _repository.searchProducts(
        query: current.query,
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
    } catch (_) {
      emit(current.copyWith(isLoadingMore: false));
    }
  }

  /// Clear the active query and return to the idle (recent searches) state.
  void clear() {
    _debounce?.cancel();
    _generation++; // invalidate any in-flight requests
    final current = state;
    emit(SearchIdle(recentSearches: current.recentSearches));
  }

  Future<void> removeRecentSearch(String query) async {
    final updated = await _storage.remove(query);
    final current = state;
    // Only update if we're still idle (don't interrupt an active search).
    if (current is SearchIdle) {
      emit(SearchIdle(recentSearches: updated));
    }
  }

  Future<void> clearAllRecentSearches() async {
    await _storage.clear();
    final current = state;
    // Only reset to Idle if we're already idle — don't interrupt an active search.
    if (current is SearchIdle) {
      emit(SearchIdle(recentSearches: const []));
    }
  }

  @override
  Future<void> close() {
    _debounce?.cancel();
    return super.close();
  }
}
