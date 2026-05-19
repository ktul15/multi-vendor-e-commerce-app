import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/theme/app_colors.dart';
import '../bloc/category_cubit.dart';
import '../bloc/category_state.dart';
import '../models/category_model.dart';
import '../widgets/category_image_drop_zone.dart';

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

  // Selected parent category ID; null means root.
  String? _selectedParentId;
  // Original parent at load time — needed to detect clearParent on save.
  String? _originalParentId;
  String? _existingImageUrl;
  Uint8List? _pickedImageBytes;
  String? _pickedImageName;

  bool _isSaving = false;
  // True once the form fields have been populated from cubit state.
  // Stays false on deep-link navigation until the first CategoryLoaded arrives.
  bool _formPopulated = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
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

    _nameController.text = cat.name;

    setState(() {
      _selectedParentId = cat.parentId;
      _originalParentId = cat.parentId;
      _existingImageUrl = cat.image;
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

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['jpg', 'jpeg', 'png', 'webp'],
      allowMultiple: false,
      withData: true,
    );
    if (result == null || result.files.single.bytes == null) return;
    _setPickedImage(result.files.single.name, result.files.single.bytes!);
  }

  void _setPickedImage(String name, Uint8List bytes) {
    setState(() {
      _pickedImageName = name;
      _pickedImageBytes = bytes;
    });
  }

  Future<void> _onSave() async {
    if (!_formKey.currentState!.validate()) return;
    if (!widget.isEditing && _pickedImageBytes == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select a category image'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);

    final name = _nameController.text.trim();

    String? error;
    if (widget.isEditing) {
      final clearParent =
          _originalParentId != null && _selectedParentId == null;
      error = await context.read<CategoryCubit>().updateCategory(
        widget.categoryId!,
        name: name,
        imageBytes: _pickedImageBytes,
        imageFilename: _pickedImageName,
        parentId: _selectedParentId,
        clearParent: clearParent,
      );
    } else {
      error = await context.read<CategoryCubit>().createCategory(
        name: name,
        imageBytes: _pickedImageBytes,
        imageFilename: _pickedImageName,
        parentId: _selectedParentId,
      );
    }

    if (!mounted) return;
    setState(() => _isSaving = false);

    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error), backgroundColor: AppColors.error),
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
      CategoryLoaded() =>
        widget.isEditing
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
                            widget.isEditing ? 'Edit Category' : 'New Category',
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
                          _ParentCategorySelector(
                            selectedParentId: _selectedParentId,
                            options: parentOptions,
                            onChanged: (id) =>
                                setState(() => _selectedParentId = id),
                          ),
                          const SizedBox(height: 20),

                          // ── Image upload ───────────────────────────────
                          Text(
                            widget.isEditing
                                ? 'Category Image (leave unchanged to keep current)'
                                : 'Category Image *',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 8),
                          _CategoryImagePickerSection(
                            pickedBytes: _pickedImageBytes,
                            pickedName: _pickedImageName,
                            existingUrl: _existingImageUrl,
                            onPick: _pickImage,
                            onDrop: (file) =>
                                _setPickedImage(file.name, file.bytes),
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

// ── Image upload section ─────────────────────────────────────────────────────

class _CategoryImagePickerSection extends StatelessWidget {
  final Uint8List? pickedBytes;
  final String? pickedName;
  final String? existingUrl;
  final VoidCallback onPick;
  final ValueChanged<DroppedImageFile> onDrop;

  const _CategoryImagePickerSection({
    required this.pickedBytes,
    required this.pickedName,
    required this.existingUrl,
    required this.onPick,
    required this.onDrop,
  });

  @override
  Widget build(BuildContext context) {
    final hasImage = pickedBytes != null || existingUrl?.isNotEmpty == true;

    return CategoryImageDropZone(
      onDropped: onDrop,
      child: InkWell(
        onTap: onPick,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.border),
            borderRadius: BorderRadius.circular(8),
            color: Colors.white,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (hasImage) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: pickedBytes != null
                      ? Image.memory(
                          pickedBytes!,
                          height: 140,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) =>
                              _placeholder(),
                        )
                      : Image.network(
                          existingUrl!,
                          height: 140,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) =>
                              _placeholder(),
                        ),
                ),
                const SizedBox(height: 12),
              ],
              Row(
                children: [
                  const Icon(
                    Icons.cloud_upload_outlined,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      pickedName ?? 'Choose an image or drag it here',
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton(
                    onPressed: onPick,
                    child: Text(hasImage ? 'Change' : 'Choose'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'JPEG, PNG, or WebP up to 5MB',
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      height: 140,
      decoration: BoxDecoration(
        color: AppColors.border,
        borderRadius: BorderRadius.circular(6),
      ),
      child: const Center(
        child: Icon(
          Icons.broken_image_outlined,
          color: AppColors.textSecondary,
        ),
      ),
    );
  }
}

// ── Parent category selector ─────────────────────────────────────────────────

class _ParentCategorySelector extends StatelessWidget {
  static const String _rootParentValue = '__root__';

  final String? selectedParentId;
  final List<CategoryModel> options;
  final ValueChanged<String?> onChanged;

  const _ParentCategorySelector({
    required this.selectedParentId,
    required this.options,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final selectedName = _selectedName();

    return InkWell(
      onTap: () => _showPicker(context),
      borderRadius: BorderRadius.circular(8),
      child: InputDecorator(
        decoration: const InputDecoration(
          labelText: 'Parent Category',
          hintText: 'None (root category)',
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                selectedName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            const Icon(
              Icons.arrow_drop_down_rounded,
              color: AppColors.textSecondary,
            ),
          ],
        ),
      ),
    );
  }

  String _selectedName() {
    if (selectedParentId == null) return 'None (root category)';
    for (final option in options) {
      if (option.id == selectedParentId) return option.name;
    }
    return 'None (root category)';
  }

  Future<void> _showPicker(BuildContext context) async {
    final selected = await showDialog<String>(
      context: context,
      builder: (context) {
        final maxHeight = MediaQuery.sizeOf(context).height * 0.65;

        return AlertDialog(
          title: const Text('Parent Category'),
          contentPadding: const EdgeInsets.fromLTRB(0, 12, 0, 8),
          content: SizedBox(
            width: 560,
            child: ConstrainedBox(
              constraints: BoxConstraints(maxHeight: maxHeight),
              child: ListView(
                shrinkWrap: true,
                children: [
                  _ParentCategoryOptionTile(
                    label: 'None (root category)',
                    selected: selectedParentId == null,
                    onTap: () => Navigator.of(context).pop(_rootParentValue),
                  ),
                  for (final option in options)
                    _ParentCategoryOptionTile(
                      label: option.name,
                      isChild: option.parentId != null,
                      selected: option.id == selectedParentId,
                      onTap: () => Navigator.of(context).pop(option.id),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );

    if (selected == null) return;
    onChanged(selected == _rootParentValue ? null : selected);
  }
}

class _ParentCategoryOptionTile extends StatelessWidget {
  final String label;
  final bool isChild;
  final bool selected;
  final VoidCallback onTap;

  const _ParentCategoryOptionTile({
    required this.label,
    required this.selected,
    required this.onTap,
    this.isChild = false,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      selected: selected,
      selectedTileColor: AppColors.primary.withValues(alpha: 0.10),
      leading: isChild
          ? const Icon(
              Icons.subdirectory_arrow_right_rounded,
              size: 18,
              color: AppColors.textSecondary,
            )
          : const SizedBox(width: 18),
      title: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
      onTap: onTap,
    );
  }
}
