import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
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

  Uint8List? _pickedImageBytes;
  String? _pickedImageName;
  // Existing image URL shown on edit form.
  String? _existingImageUrl;
  bool _isActive = true;
  bool _isSaving = false;
  bool _loadStarted = false;
  bool _isLoadingBanner = false;
  String? _loadError;
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
    if (_loadStarted || !widget.isEditing) return;
    _loadStarted = true;
    _loadBannerForEdit();
  }

  Future<void> _loadBannerForEdit() async {
    final state = context.read<BannerCubit>().state;
    final localBanner = state is BannerLoaded
        ? state.items.where((b) => b.id == widget.bannerId).firstOrNull
        : null;
    if (localBanner != null) {
      _populateForm(localBanner);
      return;
    }

    setState(() {
      _isLoadingBanner = true;
      _loadError = null;
    });

    try {
      final banner = await context.read<BannerCubit>().getBannerById(
        widget.bannerId!,
      );
      if (!mounted) return;
      _populateForm(banner);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loadError = e.statusCode == 404
            ? 'This banner no longer exists or has been deleted.'
            : e.message;
        _isLoadingBanner = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadError = 'Something went wrong. Please try again.';
        _isLoadingBanner = false;
      });
    }
  }

  void _populateForm(BannerModel banner) {
    _titleController.text = banner.title;
    _linkUrlController.text = banner.linkUrl ?? '';
    _positionController.text = banner.position.toString();
    setState(() {
      _existingImageUrl = banner.imageUrl;
      _isActive = banner.isActive;
      _hadLinkUrl = banner.linkUrl?.isNotEmpty == true;
      _isLoadingBanner = false;
      _loadError = null;
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
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: const ['jpg', 'jpeg', 'png', 'webp'],
        allowMultiple: false,
        withData: true,
      );
      if (result == null || result.files.single.bytes == null) return;
      setState(() {
        _pickedImageBytes = result.files.single.bytes!;
        _pickedImageName = result.files.single.name;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to pick image: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _onSave() async {
    if (!_formKey.currentState!.validate()) return;

    // Create requires an image.
    if (!widget.isEditing && _pickedImageBytes == null) {
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
        imageBytes: _pickedImageBytes,
        imageFilename: _pickedImageName,
        linkUrl: linkUrl.isEmpty ? null : linkUrl,
        clearLinkUrl: _hadLinkUrl && linkUrl.isEmpty,
        position: position,
        isActive: _isActive,
      );
    } else {
      error = await context.read<BannerCubit>().createBanner(
        title: title,
        imageBytes: _pickedImageBytes!,
        imageFilename: _pickedImageName ?? 'banner-image',
        linkUrl: linkUrl.isEmpty ? null : linkUrl,
        position: position,
        isActive: _isActive,
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
        listenWhen: (prev, next) => false,
        listener: (context, state) {},
        builder: (context, state) {
          if (_isLoadingBanner) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }

          if (_loadError != null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.image_not_supported_outlined,
                      size: 64,
                      color: AppColors.textSecondary,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Banner unavailable',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _loadError!,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 24),
                    FilledButton.icon(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.arrow_back_rounded, size: 18),
                      label: const Text('Back to banners'),
                    ),
                  ],
                ),
              ),
            );
          }

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
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 8),
                          _ImagePickerSection(
                            pickedBytes: _pickedImageBytes,
                            pickedName: _pickedImageName,
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
                              final position = int.tryParse(v.trim());
                              if (position == null) {
                                return 'Position must be a whole number';
                              }
                              if (position < 0) {
                                return 'Position cannot be negative';
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
                                onChanged: (v) => setState(() => _isActive = v),
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
  final Uint8List? pickedBytes;
  final String? pickedName;
  final String? existingUrl;
  final VoidCallback onPick;

  const _ImagePickerSection({
    required this.pickedBytes,
    required this.pickedName,
    required this.existingUrl,
    required this.onPick,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Preview area
        if (pickedBytes != null || existingUrl != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: pickedBytes != null
                  ? Image.memory(
                      pickedBytes!,
                      height: 120,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          _placeholder(),
                    )
                  : Image.network(
                      existingUrl!,
                      height: 120,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          _placeholder(),
                    ),
            ),
          ),
        OutlinedButton.icon(
          onPressed: onPick,
          icon: const Icon(Icons.upload_file_rounded, size: 18),
          label: Text(
            pickedBytes != null || existingUrl != null
                ? 'Change Image'
                : 'Choose Image',
          ),
        ),
        if (pickedName != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              pickedName!,
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
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
        child: Icon(
          Icons.broken_image_outlined,
          color: AppColors.textSecondary,
        ),
      ),
    );
  }
}
