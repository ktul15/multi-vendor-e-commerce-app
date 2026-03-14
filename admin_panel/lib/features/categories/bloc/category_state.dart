import 'package:equatable/equatable.dart';
import '../models/category_model.dart';

sealed class CategoryState extends Equatable {
  const CategoryState();
}

class CategoryInitial extends CategoryState {
  const CategoryInitial();

  @override
  List<Object?> get props => [];
}

class CategoryLoading extends CategoryState {
  const CategoryLoading();

  @override
  List<Object?> get props => [];
}

/// Categories loaded successfully.
/// [isMutating] is true while a create/update/delete request is in flight.
class CategoryLoaded extends CategoryState {
  final List<CategoryModel> categories;
  final bool isMutating;

  const CategoryLoaded({required this.categories, this.isMutating = false});

  /// Returns every category in the tree as a flat list.
  List<CategoryModel> flatList() {
    final result = <CategoryModel>[];
    void visit(CategoryModel cat) {
      result.add(cat);
      for (final child in cat.children) {
        visit(child);
      }
    }
    for (final cat in categories) {
      visit(cat);
    }
    return result;
  }

  /// Returns a flat list with [excludeId] **and all of its descendants**
  /// removed, preventing circular parent references in the edit form.
  List<CategoryModel> flatListExcludingSubtree(String excludeId) {
    // Collect the full subtree rooted at excludeId.
    final excluded = <String>{};
    void collectSubtree(CategoryModel cat) {
      excluded.add(cat.id);
      for (final child in cat.children) {
        collectSubtree(child);
      }
    }
    void findAndCollect(List<CategoryModel> nodes) {
      for (final cat in nodes) {
        if (cat.id == excludeId) {
          collectSubtree(cat);
          return;
        }
        findAndCollect(cat.children);
      }
    }
    findAndCollect(categories);

    // Return all nodes not in the excluded set.
    final result = <CategoryModel>[];
    void visit(CategoryModel cat) {
      if (excluded.contains(cat.id)) return;
      result.add(cat);
      for (final child in cat.children) {
        visit(child);
      }
    }
    for (final cat in categories) {
      visit(cat);
    }
    return result;
  }

  CategoryLoaded copyWith({
    List<CategoryModel>? categories,
    bool? isMutating,
  }) {
    return CategoryLoaded(
      categories: categories ?? this.categories,
      isMutating: isMutating ?? this.isMutating,
    );
  }

  @override
  List<Object?> get props => [categories, isMutating];
}

/// An operation failed. [categories] preserves the last known data so the
/// list can stay populated while the error is displayed.
class CategoryError extends CategoryState {
  final String message;
  final List<CategoryModel> categories;

  const CategoryError({required this.message, this.categories = const []});

  @override
  List<Object?> get props => [message, categories];
}
