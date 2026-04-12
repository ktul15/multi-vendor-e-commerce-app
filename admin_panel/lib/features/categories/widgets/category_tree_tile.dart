import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/theme/app_colors.dart';
import '../bloc/category_cubit.dart';
import '../bloc/category_state.dart';
import '../models/category_model.dart';
import 'delete_confirm_dialog.dart';

/// Recursively renders a category node with expand/collapse for children.
class CategoryTreeTile extends StatefulWidget {
  final CategoryModel category;
  final int depth;
  final void Function(CategoryModel) onEdit;

  const CategoryTreeTile({
    super.key,
    required this.category,
    this.depth = 0,
    required this.onEdit,
  });

  @override
  State<CategoryTreeTile> createState() => _CategoryTreeTileState();
}

class _CategoryTreeTileState extends State<CategoryTreeTile> {
  bool _expanded = true;

  @override
  Widget build(BuildContext context) {
    final cat = widget.category;
    final hasChildren = cat.children.isNotEmpty;
    final indent = widget.depth * 24.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: hasChildren
              ? () => setState(() => _expanded = !_expanded)
              : null,
          child: Padding(
            padding: EdgeInsets.only(
              left: 16 + indent,
              right: 8,
              top: 4,
              bottom: 4,
            ),
            child: Row(
              children: [
                // Expand/collapse toggle
                SizedBox(
                  width: 24,
                  child: hasChildren
                      ? Icon(
                          _expanded
                              ? Icons.expand_more_rounded
                              : Icons.chevron_right_rounded,
                          size: 20,
                          color: AppColors.textSecondary,
                        )
                      : const SizedBox.shrink(),
                ),
                const SizedBox(width: 4),
                // Category icon / image
                _CategoryAvatar(category: cat),
                const SizedBox(width: 12),
                // Name + slug
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        cat.name,
                        style: Theme.of(context)
                            .textTheme
                            .bodyMedium
                            ?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      Text(
                        cat.slug,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.textSecondary,
                            ),
                      ),
                    ],
                  ),
                ),
                // Actions
                BlocBuilder<CategoryCubit, CategoryState>(
                  buildWhen: (prev, next) =>
                      (prev is CategoryLoaded) != (next is CategoryLoaded) ||
                      (prev is CategoryLoaded &&
                          next is CategoryLoaded &&
                          prev.isMutating != next.isMutating),
                  builder: (context, state) {
                    final isMutating =
                        state is CategoryLoaded && state.isMutating;
                    return Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          tooltip: 'Edit',
                          icon: const Icon(Icons.edit_outlined, size: 18),
                          onPressed: isMutating
                              ? null
                              : () => widget.onEdit(cat),
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
              ],
            ),
          ),
        ),
        if (hasChildren && _expanded)
          for (final child in cat.children)
            CategoryTreeTile(
              key: ValueKey(child.id),
              category: child,
              depth: widget.depth + 1,
              onEdit: widget.onEdit,
            ),
        if (widget.depth == 0)
          const Divider(height: 1, indent: 16, endIndent: 16),
      ],
    );
  }

  Future<void> _onDelete(BuildContext context, CategoryModel cat) async {
    final confirmed = await showDeleteConfirmDialog(
      context,
      categoryName: cat.name,
    );
    if (confirmed != true || !context.mounted) return;
    final error = await context.read<CategoryCubit>().deleteCategory(cat.id);
    if (!context.mounted) return;
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error),
          backgroundColor: AppColors.error,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Category deleted')),
      );
    }
  }
}

class _CategoryAvatar extends StatelessWidget {
  final CategoryModel category;

  const _CategoryAvatar({required this.category});

  @override
  Widget build(BuildContext context) {
    if (category.image != null && category.image!.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(6),
        child: Image.network(
          category.image!,
          width: 32,
          height: 32,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) => _placeholder(),
        ),
      );
    }
    return _placeholder();
  }

  Widget _placeholder() {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: AppColors.primary.withAlpha(20),
        borderRadius: BorderRadius.circular(6),
      ),
      child: const Icon(Icons.category_rounded,
          size: 18, color: AppColors.primary),
    );
  }
}
