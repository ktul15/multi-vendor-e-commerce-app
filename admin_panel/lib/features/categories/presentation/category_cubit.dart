import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../data/category_repository.dart';
import '../domain/category_model.dart';
import 'category_state.dart';

class CategoryCubit extends Cubit<CategoryState> {
  final CategoryRepository _repository;

  CategoryCubit({required CategoryRepository repository})
      : _repository = repository,
        super(const CategoryInitial());

  Future<void> loadCategories() async {
    emit(const CategoryLoading());
    try {
      final categories = await _repository.getAllCategories();
      emit(CategoryLoaded(categories: categories));
    } on ApiException catch (e) {
      emit(CategoryError(message: e.message));
    } catch (e) {
      emit(CategoryError(message: e.toString()));
    }
  }

  /// Loads categories only if not already loaded or loading. Safe to call on
  /// every route rebuild — skips the network call when data is fresh and
  /// prevents duplicate in-flight requests.
  Future<void> ensureLoaded() async {
    if (state is CategoryLoaded || state is CategoryLoading) return;
    await loadCategories();
  }

  /// Creates a category. Returns null on success, or an error message on failure.
  Future<String?> createCategory({
    required String name,
    String? image,
    String? parentId,
  }) async {
    final existing = _currentCategories();
    emit(CategoryLoaded(categories: existing, isMutating: true));
    try {
      await _repository.createCategory(
          name: name, image: image, parentId: parentId);
      await _silentRefresh();
      return null;
    } on ApiException catch (e) {
      emit(CategoryLoaded(categories: existing));
      return e.message;
    } catch (e) {
      emit(CategoryLoaded(categories: existing));
      return e.toString();
    }
  }

  /// Updates a category. Returns null on success, or an error message on failure.
  Future<String?> updateCategory(
    String id, {
    required String name,
    String? image,
    String? parentId,
    bool clearParent = false,
  }) async {
    final existing = _currentCategories();
    emit(CategoryLoaded(categories: existing, isMutating: true));
    try {
      await _repository.updateCategory(
        id,
        name: name,
        image: image,
        parentId: parentId,
        clearParent: clearParent,
      );
      await _silentRefresh();
      return null;
    } on ApiException catch (e) {
      emit(CategoryLoaded(categories: existing));
      return e.message;
    } catch (e) {
      emit(CategoryLoaded(categories: existing));
      return e.toString();
    }
  }

  /// Deletes a category. Returns null on success, or an error message on failure.
  Future<String?> deleteCategory(String id) async {
    final existing = _currentCategories();
    emit(CategoryLoaded(categories: existing, isMutating: true));
    try {
      await _repository.deleteCategory(id);
      await _silentRefresh();
      return null;
    } on ApiException catch (e) {
      emit(CategoryLoaded(categories: existing));
      return e.message;
    } catch (e) {
      emit(CategoryLoaded(categories: existing));
      return e.toString();
    }
  }

  /// Refreshes categories without emitting a loading state.
  /// Throws on failure so the caller's catch block surfaces the error.
  Future<void> _silentRefresh() async {
    final categories = await _repository.getAllCategories();
    emit(CategoryLoaded(categories: categories));
  }

  List<CategoryModel> _currentCategories() {
    final s = state;
    if (s is CategoryLoaded) return s.categories;
    if (s is CategoryError) return s.categories;
    return const [];
  }
}
