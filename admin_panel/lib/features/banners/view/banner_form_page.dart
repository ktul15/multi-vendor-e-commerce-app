import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/theme/app_colors.dart';
import '../bloc/banner_cubit.dart';
import '../bloc/banner_state.dart';
import '../models/banner_model.dart';

/// Add / edit page for a single banner.
/// Receives its [BannerCubit] via [BlocProvider.value] from the router.
class BannerFormPage extends StatefulWidget {
  /// Non-null when editing an existing banner.
  final String? bannerId;

  const BannerFormPage({super.key, this.bannerId});

  bool get isEditing => bannerId != null;

  @override
  State<BannerFormPage> createState() => _BannerFormPageState();
}

class _BannerFormPageState extends State<BannerFormPage> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  late final TextEditingController _linkUrlController;
  late final TextEditingController _positionController;

  // Picked file path (create) or null (keeping existing image on edit).
  String? _pickedImagePath;
  // Existing image URL shown on edit form.
  String? _existingImageUrl;
  bool _isActive = true;
  bool _isSaving = false;
  bool _formPopulated = false;
  // True when the loaded banner had a non-empty linkUrl.
  // Used to detect when the user has cleared a previously-set link URL
  // so that clearLinkUrl: true is only sent when there was actually a URL to clear.
  bool _hadLinkUrl = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController();
    _linkUrlController = TextEditingController();
    _positionController = TextEditingController(text: '0');
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_formPopulated || !widget.isEditing) return;

    final state = context.read<BannerCubit>().state;
    if (state is BannerLoaded || state is BannerError) {
      _loadFromState();
    } else if (state is BannerInitial) {
      context.read<BannerCubit>().load();
    }
  }

  void _loadFromState() {
    final state = context.read<BannerCubit>().state;
    if (state is BannerError) {
      // Data failed to load — navigate back with an error so the user isn't
      // stuck on a blank form with no feedback.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load banner: ${state.message}'),
            backgroundColor: AppColors.error,
          ),
        );
      });
      return;
    }
    final items = switch (state) {
      BannerLoaded() => state.items,
      _ => <BannerModel>[],
    };
    final banner = items.where((b) => b.id == widget.bannerId).firstOrNull;
    if (banner == null) return;

    _titleController.text = banner.title;
    _linkUrlController.text = banner.linkUrl ?? '';
    _positionController.text = banner.position.toString();
    setState(() {
      _existingImageUrl = banner.imageUrl;
      _isActive = banner.isActive;
      _hadLinkUrl = banner.linkUrl?.isNotEmpty == true;
      _formPopulated = true;
    });
  }

  @override
  void dispose() {
    _titleController.dispose();
    _linkUrlController.dispose();
    _positionController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.image,
      allowMultiple: false,
    );
    if (result == null || result.files.single.path == null) return;
    setState(() => _pickedImagePath = result.files.single.path!);
  }

  Future<void> _onSave() async {
    if (!_formKey.currentState!.validate()) return;

    // Create requires an image.
    if (!widget.isEditing && _pickedImagePath == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select a banner image'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);

    final title = _titleController.text.trim();
    final linkUrl = _linkUrlController.text.trim();
    final position = int.tryParse(_positionController.text.trim()) ?? 0;

    String? error;
    if (widget.isEditing) {
      error = await context.read<BannerCubit>().updateBanner(
            widget.bannerId!,
            title: title,
            imagePath: _pickedImagePath,
            linkUrl: linkUrl.isEmpty ? null : linkUrl,
            clearLinkUrl: _hadLinkUrl && linkUrl.isEmpty,
            position: position,
            isActive: _isActive,
          );
    } else {
      error = await context.read<BannerCubit>().createBanner(
            title: title,
            imagePath: _pickedImagePath!,
            linkUrl: linkUrl.isEmpty ? null : linkUrl,
            position: position,
            isActive: _isActive,
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
                ? 'Banner updated successfully'
                : 'Banner created successfully',
          ),
        ),
      );
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: Text(widget.isEditing ? 'Edit Banner' : 'Add Banner'),
      ),
      body: BlocConsumer<BannerCubit, BannerState>(
        listenWhen: (prev, next) =>
            widget.isEditing &&
            !_formPopulated &&
            (next is BannerLoaded || next is BannerError),
        listener: (context, state) => _loadFromState(),
        builder: (context, state) {
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
                            widget.isEditing ? 'Edit Banner' : 'New Banner',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 24),

                          // ── Title ─────────────────────────────────────
                          TextFormField(
                            controller: _titleController,
                            decoration: const InputDecoration(
                              labelText: 'Title *',
                              hintText: 'e.g. Summer Sale',
                            ),
                            textInputAction: TextInputAction.next,
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) {
                                return 'Title is required';
                              }
                              if (v.trim().length < 2) {
                                return 'Title must be at least 2 characters';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),

                          // ── Image picker ──────────────────────────────
                          Text(
                            widget.isEditing
                                ? 'Banner Image (leave unchanged to keep current)'
                                : 'Banner Image *',
                            style:
                                Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: AppColors.textSecondary,
                                    ),
                          ),
                          const SizedBox(height: 8),
                          _ImagePickerSection(
                            pickedPath: _pickedImagePath,
                            existingUrl: _existingImageUrl,
                            onPick: _pickImage,
                          ),
                          const SizedBox(height: 20),

                          // ── Link URL ──────────────────────────────────
                          TextFormField(
                            controller: _linkUrlController,
                            decoration: const InputDecoration(
                              labelText: 'Link URL',
                              hintText: 'https://example.com/sale',
                              helperText: 'Optional — leave blank for no link',
                            ),
                            textInputAction: TextInputAction.next,
                            keyboardType: TextInputType.url,
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) return null;
                              final uri = Uri.tryParse(v.trim());
                              if (uri == null ||
                                  !uri.hasScheme ||
                                  !uri.scheme.startsWith('http')) {
                                return 'Please enter a valid URL';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),

                          // ── Position ──────────────────────────────────
                          TextFormField(
                            controller: _positionController,
                            decoration: const InputDecoration(
                              labelText: 'Position',
                              hintText: '0',
                              helperText: 'Lower numbers appear first',
                            ),
                            textInputAction: TextInputAction.done,
                            keyboardType: TextInputType.number,
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) return null;
                              if (int.tryParse(v.trim()) == null) {
                                return 'Position must be a whole number';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),

                          // ── Active toggle ─────────────────────────────
                          Row(
                            children: [
                              Switch(
                                value: _isActive,
                                onChanged: (v) =>
                                    setState(() => _isActive = v),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                _isActive ? 'Active' : 'Inactive',
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            ],
                          ),
                          const SizedBox(height: 32),

                          // ── Save button ───────────────────────────────
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
                                          : 'Create Banner',
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

// ── Image picker section ──────────────────────────────────────────────────────

class _ImagePickerSection extends StatelessWidget {
  final String? pickedPath;
  final String? existingUrl;
  final VoidCallback onPick;

  const _ImagePickerSection({
    required this.pickedPath,
    required this.existingUrl,
    required this.onPick,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Preview area
        if (pickedPath != null || existingUrl != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: pickedPath != null
                  ? Image.file(
                      File(pickedPath!),
                      height: 120,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => _placeholder(),
                    )
                  : Image.network(
                      existingUrl!,
                      height: 120,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => _placeholder(),
                    ),
            ),
          ),
        OutlinedButton.icon(
          onPressed: onPick,
          icon: const Icon(Icons.upload_file_rounded, size: 18),
          label: Text(pickedPath != null || existingUrl != null
              ? 'Change Image'
              : 'Choose Image'),
        ),
        if (pickedPath != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              pickedPath!.split('/').last,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: AppColors.textSecondary),
              overflow: TextOverflow.ellipsis,
            ),
          ),
      ],
    );
  }

  Widget _placeholder() {
    return Container(
      height: 120,
      decoration: BoxDecoration(
        color: AppColors.border,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Center(
        child: Icon(Icons.broken_image_outlined,
            color: AppColors.textSecondary),
      ),
    );
  }
}
