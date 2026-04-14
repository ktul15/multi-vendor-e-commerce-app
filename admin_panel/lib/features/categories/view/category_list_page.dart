import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../bloc/category_cubit.dart';
import '../bloc/category_state.dart';
import '../models/category_model.dart';
import '../../../shared/widgets/skeleton_box.dart';
import '../../../shared/widgets/error_state.dart';
import '../../../shared/widgets/empty_state.dart';
import '../widgets/category_skeleton.dart';
import '../widgets/category_tree_tile.dart';
import '../widgets/delete_confirm_dialog.dart';

// The CategoryCubit is provided via BlocProvider.value in app_router.dart,
// so this page is a plain StatefulWidget with no BlocProvider wrapper.
class CategoryListPage extends StatefulWidget {
  const CategoryListPage({super.key});

  @override
  State<CategoryListPage> createState() => _CategoryListPageState();
}

class _CategoryListPageState extends State<CategoryListPage> {
  // 0 = Table, 1 = Tree
  int _viewIndex = 0;

  void _onEdit(CategoryModel category) {
    context.pushNamed(
      AppRoutes.categoryEditName,
      pathParameters: {'id': category.id},
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Categories'),
        actions: [
          // Table / Tree toggle
          SegmentedButton<int>(
            segments: const [
              ButtonSegment(
                value: 0,
                icon: Icon(Icons.table_rows_rounded),
                label: Text('Table'),
              ),
              ButtonSegment(
                value: 1,
                icon: Icon(Icons.account_tree_outlined),
                label: Text('Tree'),
              ),
            ],
            selected: {_viewIndex},
            onSelectionChanged: (s) => setState(() => _viewIndex = s.first),
            style: ButtonStyle(
              visualDensity: VisualDensity.compact,
            ),
          ),
          const SizedBox(width: 8),
          // Add category button
          BlocBuilder<CategoryCubit, CategoryState>(
            buildWhen: (p, n) =>
                (p is CategoryLoaded) != (n is CategoryLoaded) ||
                (p is CategoryLoaded &&
                    n is CategoryLoaded &&
                    p.isMutating != n.isMutating),
            builder: (context, state) {
              return FilledButton.icon(
                onPressed: (state is CategoryLoaded && state.isMutating)
                    ? null
                    : () => context.pushNamed(AppRoutes.categoryCreateName),
                icon: const Icon(Icons.add_rounded, size: 18),
                label: const Text('Add Category'),
              );
            },
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: BlocConsumer<CategoryCubit, CategoryState>(
        listener: (context, state) {
          if (state is CategoryError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is CategoryInitial || state is CategoryLoading) {
            return const SkeletonContainer(child: CategorySkeleton());
          }

          final categories = switch (state) {
            CategoryLoaded(:final categories) => categories,
            CategoryError(:final categories) => categories,
            _ => const <CategoryModel>[],
          };

          if (state is CategoryError && categories.isEmpty) {
            return ErrorState(
              message: state.message,
              onRetry: () => context.read<CategoryCubit>().loadCategories(),
            );
          }

          if (categories.isEmpty) {
            return const EmptyState(
              icon: Icons.category_outlined,
              title: 'No categories yet',
              subtitle: 'Add your first category to get started.',
            );
          }

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () => context.read<CategoryCubit>().loadCategories(),
            child: _viewIndex == 0
                ? _TableView(
                    categories: categories,
                    onEdit: _onEdit,
                  )
                : _TreeView(
                    categories: categories,
                    onEdit: _onEdit,
                  ),
          );
        },
      ),
    );
  }
}

// ── Table view ────────────────────────────────────────────────────────────────

class _TableView extends StatelessWidget {
  final List<CategoryModel> categories;
  final void Function(CategoryModel) onEdit;

  const _TableView({required this.categories, required this.onEdit});

  /// Flatten the tree into a displayable list with depth info.
  List<({CategoryModel cat, int depth})> _flatten(
    List<CategoryModel> nodes,
    int depth,
  ) {
    return [
      for (final cat in nodes) ...[
        (cat: cat, depth: depth),
        ..._flatten(cat.children, depth + 1),
      ]
    ];
  }

  @override
  Widget build(BuildContext context) {
    final flat = _flatten(categories, 0);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Card(
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            columnSpacing: 32,
            columns: const [
              DataColumn(label: Text('Name')),
              DataColumn(label: Text('Slug')),
              DataColumn(label: Text('Parent')),
              DataColumn(label: Text('Image')),
              DataColumn(label: Text('Actions')),
            ],
            rows: flat.map((entry) {
              final cat = entry.cat;
              final indent = entry.depth * 16.0;
              return DataRow(cells: [
                // Name (indented to show hierarchy)
                DataCell(
                  Padding(
                    padding: EdgeInsets.only(left: indent),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (entry.depth > 0) ...[
                          Icon(Icons.subdirectory_arrow_right_rounded,
                              size: 16, color: AppColors.textSecondary),
                          const SizedBox(width: 4),
                        ],
                        Text(
                          cat.name,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ),
                // Slug
                DataCell(
                  Text(
                    cat.slug,
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
                // Parent
                DataCell(
                  Text(
                    cat.parentId == null ? '—' : 'Has parent',
                    style: TextStyle(
                      color: cat.parentId == null
                          ? AppColors.textSecondary
                          : AppColors.primary,
                    ),
                  ),
                ),
                // Image
                DataCell(
                  cat.image != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: Image.network(
                            cat.image!,
                            width: 36,
                            height: 36,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                const Icon(
                              Icons.broken_image_outlined,
                              size: 20,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        )
                      : const Icon(
                          Icons.image_not_supported_outlined,
                          size: 20,
                          color: AppColors.textSecondary,
                        ),
                ),
                // Actions
                DataCell(
                  BlocBuilder<CategoryCubit, CategoryState>(
                    buildWhen: (p, n) =>
                        (p is CategoryLoaded) != (n is CategoryLoaded) ||
                        (p is CategoryLoaded &&
                            n is CategoryLoaded &&
                            p.isMutating != n.isMutating),
                    builder: (context, state) {
                      final isMutating =
                          state is CategoryLoaded && state.isMutating;
                      return Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            tooltip: 'Edit',
                            icon: const Icon(Icons.edit_outlined, size: 18),
                            onPressed:
                                isMutating ? null : () => onEdit(cat),
                          ),
                          IconButton(
                            tooltip: 'Delete',
                            icon: Icon(
                              Icons.delete_outline_rounded,
                              size: 18,
                              color: isMutating ? null : AppColors.error,
                            ),
                            onPressed: isMutating
                                ? null
                                : () => _onDelete(context, cat),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ]);
            }).toList(),
          ),
        ),
      ),
    );
  }

  Future<void> _onDelete(BuildContext context, CategoryModel cat) async {
    final confirmed = await showDeleteConfirmDialog(
      context,
      categoryName: cat.name,
    );
    if (confirmed != true || !context.mounted) return;
    final error =
        await context.read<CategoryCubit>().deleteCategory(cat.id);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(error ?? 'Category deleted'),
        backgroundColor: error != null ? AppColors.error : null,
      ),
    );
  }
}

// ── Tree view ─────────────────────────────────────────────────────────────────

class _TreeView extends StatelessWidget {
  final List<CategoryModel> categories;
  final void Function(CategoryModel) onEdit;

  const _TreeView({required this.categories, required this.onEdit});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Card(
        margin: const EdgeInsets.all(24),
        child: Column(
          children: [
            for (final cat in categories)
              CategoryTreeTile(
                key: ValueKey(cat.id),
                category: cat,
                onEdit: onEdit,
              ),
          ],
        ),
      ),
    );
  }
}

