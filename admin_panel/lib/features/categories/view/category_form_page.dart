import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/theme/app_colors.dart';
import '../bloc/category_cubit.dart';
import '../bloc/category_state.dart';
import '../models/category_model.dart';

/// Add / edit page for a single category.
/// Receives its [CategoryCubit] via [BlocProvider.value] from the router
/// so it shares state with [CategoryListPage].
class CategoryFormPage extends StatefulWidget {
  /// Non-null when editing an existing category.
  final String? categoryId;

  const CategoryFormPage({super.key, this.categoryId});

  bool get isEditing => categoryId != null;

  @override
  State<CategoryFormPage> createState() => _CategoryFormPageState();
}

class _CategoryFormPageState extends State<CategoryFormPage> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _imageController;

  // Selected parent category ID; null means root.
  String? _selectedParentId;
  // Original parent at load time — needed to detect clearParent on save.
  String? _originalParentId;

  bool _isSaving = false;
  // True once the form fields have been populated from cubit state.
  // Stays false on deep-link navigation until the first CategoryLoaded arrives.
  bool _formPopulated = false;

  // Debounce image URL changes so network preview only fires after the
  // user stops typing for 600 ms.
  Timer? _previewDebounce;
  final _previewUrl = ValueNotifier<String>('');

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _imageController = TextEditingController()
      ..addListener(_onImageChanged);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_formPopulated || !widget.isEditing) return;

    final state = context.read<CategoryCubit>().state;
    if (state is CategoryLoaded || state is CategoryError) {
      // Data is already available (normal navigation from list page).
      _loadFromState();
    } else {
      // State is Initial — deep link directly to the edit route.
      // Kick off a load; the BlocConsumer listener in build() will populate
      // the form once CategoryLoaded arrives.
      if (state is CategoryInitial) {
        context.read<CategoryCubit>().loadCategories();
      }
    }
  }

  void _loadFromState() {
    final state = context.read<CategoryCubit>().state;
    final cats = switch (state) {
      CategoryLoaded() => state.categories,
      CategoryError() => state.categories,
      _ => const <CategoryModel>[],
    };
    final cat = _findById(cats, widget.categoryId!);
    if (cat == null) return;

    // Bypass the debounce for the initial image value.
    _imageController.removeListener(_onImageChanged);
    _nameController.text = cat.name;
    _imageController.text = cat.image ?? '';
    _imageController.addListener(_onImageChanged);
    _previewUrl.value = cat.image?.trim() ?? '';

    setState(() {
      _selectedParentId = cat.parentId;
      _originalParentId = cat.parentId;
      _formPopulated = true;
    });
  }

  CategoryModel? _findById(List<CategoryModel> cats, String id) {
    for (final cat in cats) {
      if (cat.id == id) return cat;
      final found = _findById(cat.children, id);
      if (found != null) return found;
    }
    return null;
  }

  void _onImageChanged() {
    _previewDebounce?.cancel();
    _previewDebounce = Timer(const Duration(milliseconds: 600), () {
      _previewUrl.value = _imageController.text.trim();
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _imageController.dispose();
    _previewDebounce?.cancel();
    _previewUrl.dispose();
    super.dispose();
  }

  Future<void> _onSave() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    final name = _nameController.text.trim();
    final image = _imageController.text.trim();

    String? error;
    if (widget.isEditing) {
      final clearParent =
          _originalParentId != null && _selectedParentId == null;
      error = await context.read<CategoryCubit>().updateCategory(
            widget.categoryId!,
            name: name,
            image: image.isEmpty ? null : image,
            parentId: _selectedParentId,
            clearParent: clearParent,
          );
    } else {
      error = await context.read<CategoryCubit>().createCategory(
            name: name,
            image: image.isEmpty ? null : image,
            parentId: _selectedParentId,
          );
    }

    if (!mounted) return;
    setState(() => _isSaving = false);

    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error),
          backgroundColor: AppColors.error,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            widget.isEditing
                ? 'Category updated successfully'
                : 'Category created successfully',
          ),
        ),
      );
      Navigator.of(context).pop();
    }
  }

  List<CategoryModel> _getParentOptions(CategoryState state) {
    return switch (state) {
      CategoryLoaded() => widget.isEditing
          // Exclude the node being edited AND all its descendants to prevent
          // circular parent references.
          ? state.flatListExcludingSubtree(widget.categoryId!)
          : state.flatList(),
      CategoryError() => _flattenCategories(state.categories),
      _ => const <CategoryModel>[],
    };
  }

  static List<CategoryModel> _flattenCategories(List<CategoryModel> cats) {
    final result = <CategoryModel>[];
    void visit(CategoryModel cat) {
      result.add(cat);
      for (final child in cat.children) {
        visit(child);
      }
    }
    for (final cat in cats) {
      visit(cat);
    }
    return result;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: Text(widget.isEditing ? 'Edit Category' : 'Add Category'),
      ),
      body: BlocConsumer<CategoryCubit, CategoryState>(
        // Deep-link case: form was opened before categories loaded.
        // Populate fields the first time CategoryLoaded arrives.
        listenWhen: (prev, next) =>
            widget.isEditing &&
            !_formPopulated &&
            (next is CategoryLoaded || next is CategoryError),
        listener: (context, state) => _loadFromState(),
        builder: (context, state) {
          final parentOptions = _getParentOptions(state);

          return SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 560),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.isEditing
                                ? 'Edit Category'
                                : 'New Category',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 24),

                          // ── Name ───────────────────────────────────────
                          TextFormField(
                            controller: _nameController,
                            decoration: const InputDecoration(
                              labelText: 'Name *',
                              hintText: 'e.g. Electronics',
                            ),
                            textInputAction: TextInputAction.next,
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) {
                                return 'Name is required';
                              }
                              if (v.trim().length < 2) {
                                return 'Name must be at least 2 characters';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),

                          // ── Parent category ────────────────────────────
                          // `value` is deprecated in Flutter 3.33 but
                          // `initialValue` does not support controlled state.
                          // Track Flutter migration to DropdownMenu.
                          DropdownButtonFormField<String?>(
                            // ignore: deprecated_member_use
                            value: _selectedParentId,
                            decoration: const InputDecoration(
                              labelText: 'Parent Category',
                              hintText: 'None (root category)',
                            ),
                            items: [
                              const DropdownMenuItem<String?>(
                                value: null,
                                child: Text('None (root category)'),
                              ),
                              ...parentOptions.map(
                                (cat) => DropdownMenuItem<String?>(
                                  value: cat.id,
                                  child: _ParentDropdownItem(cat: cat),
                                ),
                              ),
                            ],
                            onChanged: (v) =>
                                setState(() => _selectedParentId = v),
                          ),
                          const SizedBox(height: 20),

                          // ── Image URL ──────────────────────────────────
                          TextFormField(
                            controller: _imageController,
                            decoration: const InputDecoration(
                              labelText: 'Image URL',
                              hintText: 'https://example.com/image.jpg',
                              helperText: 'Optional — leave blank for no image',
                            ),
                            textInputAction: TextInputAction.done,
                            keyboardType: TextInputType.url,
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) return null;
                              final uri = Uri.tryParse(v.trim());
                              if (uri == null ||
                                  !uri.hasScheme ||
                                  (!uri.scheme.startsWith('http'))) {
                                return 'Please enter a valid URL';
                              }
                              return null;
                            },
                          ),

                          // ── Image preview (debounced 600 ms) ───────────
                          ValueListenableBuilder<String>(
                            valueListenable: _previewUrl,
                            builder: (context, url, _) {
                              if (url.isEmpty) return const SizedBox.shrink();
                              return Padding(
                                padding: const EdgeInsets.only(top: 16),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.network(
                                    url,
                                    height: 120,
                                    width: double.infinity,
                                    fit: BoxFit.cover,
                                    errorBuilder:
                                        (context, error, stackTrace) =>
                                            Container(
                                      height: 120,
                                      decoration: BoxDecoration(
                                        color: AppColors.border,
                                        borderRadius:
                                            BorderRadius.circular(8),
                                      ),
                                      child: const Center(
                                        child: Icon(
                                          Icons.broken_image_outlined,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),

                          const SizedBox(height: 32),

                          // ── Save button ────────────────────────────────
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: _isSaving ? null : _onSave,
                              child: _isSaving
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : Text(
                                      widget.isEditing
                                          ? 'Save Changes'
                                          : 'Create Category',
                                    ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ── Dropdown item showing indented hierarchy ───────────────────────────────────

class _ParentDropdownItem extends StatelessWidget {
  final CategoryModel cat;

  const _ParentDropdownItem({required this.cat});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (cat.parentId != null) ...[
          const Icon(Icons.subdirectory_arrow_right_rounded,
              size: 14, color: AppColors.textSecondary),
          const SizedBox(width: 4),
        ],
        Flexible(child: Text(cat.name, overflow: TextOverflow.ellipsis)),
      ],
    );
  }
}
