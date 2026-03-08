import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/product_model.dart';

/// Displays size and/or color chips for variant selection.
///
/// Selecting a chip narrows the other dimension to only available combinations.
/// When a full match is found (size + color, or just one dimension), the parent
/// is notified via [onSelect]. When only one dimension is selected the parent
/// receives `null` until both dimensions are chosen.
class VariantSelector extends StatefulWidget {
  final List<VariantModel> variants;
  final VariantModel? selected;
  final ValueChanged<VariantModel?> onSelect;

  const VariantSelector({
    super.key,
    required this.variants,
    this.selected,
    required this.onSelect,
  });

  @override
  State<VariantSelector> createState() => _VariantSelectorState();
}

class _VariantSelectorState extends State<VariantSelector> {
  // Cached dimension lists — only recomputed when variants change.
  late List<String> _sizes;
  late List<String> _colors;

  String? _selectedSize;
  String? _selectedColor;

  bool get _hasSizes => _sizes.isNotEmpty;
  bool get _hasColors => _colors.isNotEmpty;

  void _computeDimensions() {
    _sizes = widget.variants
        .map((v) => v.size)
        .whereType<String>()
        .toSet()
        .toList();
    _colors = widget.variants
        .map((v) => v.color)
        .whereType<String>()
        .toSet()
        .toList();
  }

  @override
  void initState() {
    super.initState();
    _computeDimensions();
    _selectedSize = widget.selected?.size;
    _selectedColor = widget.selected?.color;
  }

  @override
  void didUpdateWidget(VariantSelector oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.variants != oldWidget.variants) {
      _computeDimensions();
    }
    // Sync selection whenever the parent cubit resets the variant (e.g. on
    // clearVariant or after a product reload).
    if (widget.selected != oldWidget.selected) {
      setState(() {
        _selectedSize = widget.selected?.size;
        _selectedColor = widget.selected?.color;
      });
    }
  }

  /// Colors available for the given [size], or all colors if [size] is null.
  Set<String> _availableColorsForSize(String? size) {
    if (size == null) return _colors.toSet();
    return widget.variants
        .where((v) => v.size == size)
        .map((v) => v.color)
        .whereType<String>()
        .toSet();
  }

  /// Sizes available for the given [color], or all sizes if [color] is null.
  Set<String> _availableSizesForColor(String? color) {
    if (color == null) return _sizes.toSet();
    return widget.variants
        .where((v) => v.color == color)
        .map((v) => v.size)
        .whereType<String>()
        .toSet();
  }

  bool _isVariantInStock(String? size, String? color) {
    return widget.variants.any((v) {
      final sizeMatch = !_hasSizes || v.size == size;
      final colorMatch = !_hasColors || v.color == color;
      return sizeMatch && colorMatch && v.stock > 0;
    });
  }

  void _onSizeSelected(String size) {
    // Compute the new size *before* mutating state so availability checks
    // run against the intended new value, not the mid-mutation state.
    final newSize = _selectedSize == size ? null : size;
    final availableColors = _availableColorsForSize(newSize);

    setState(() {
      _selectedSize = newSize;
      // If the current color is no longer valid for the new size, clear it.
      if (newSize != null &&
          _selectedColor != null &&
          !availableColors.contains(_selectedColor)) {
        _selectedColor = null;
      }
    });
    _notifyParent();
  }

  void _onColorSelected(String color) {
    final newColor = _selectedColor == color ? null : color;
    final availableSizes = _availableSizesForColor(newColor);

    setState(() {
      _selectedColor = newColor;
      if (newColor != null &&
          _selectedSize != null &&
          !availableSizes.contains(_selectedSize)) {
        _selectedSize = null;
      }
    });
    _notifyParent();
  }

  void _notifyParent() {
    final sizeReady = !_hasSizes || _selectedSize != null;
    final colorReady = !_hasColors || _selectedColor != null;

    if (!sizeReady || !colorReady) {
      widget.onSelect(null);
      return;
    }

    final matches = widget.variants.where((v) {
      final sizeMatch = !_hasSizes || v.size == _selectedSize;
      final colorMatch = !_hasColors || v.color == _selectedColor;
      return sizeMatch && colorMatch;
    });
    widget.onSelect(matches.isEmpty ? null : matches.first);
  }

  @override
  Widget build(BuildContext context) {
    if (!_hasSizes && !_hasColors) return const SizedBox.shrink();

    final availableColors = _availableColorsForSize(_selectedSize);
    final availableSizes = _availableSizesForColor(_selectedColor);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_hasSizes) ...[
          Text('Size', style: AppTextStyles.h6),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: _sizes.map((size) {
              final isSelected = _selectedSize == size;
              final isAvailable = availableSizes.contains(size);
              final inStock = _isVariantInStock(
                  size, _hasColors ? _selectedColor : null);
              return _VariantChip(
                label: size,
                isSelected: isSelected,
                isEnabled: isAvailable,
                isInStock: inStock,
                onTap: isAvailable ? () => _onSizeSelected(size) : null,
              );
            }).toList(),
          ),
          const SizedBox(height: AppSpacing.base),
        ],
        if (_hasColors) ...[
          Text('Color', style: AppTextStyles.h6),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: _colors.map((color) {
              final isSelected = _selectedColor == color;
              final isAvailable = availableColors.contains(color);
              final inStock = _isVariantInStock(
                  _hasSizes ? _selectedSize : null, color);
              return _VariantChip(
                label: color,
                isSelected: isSelected,
                isEnabled: isAvailable,
                isInStock: inStock,
                onTap: isAvailable ? () => _onColorSelected(color) : null,
              );
            }).toList(),
          ),
        ],
      ],
    );
  }
}

class _VariantChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final bool isEnabled;
  final bool isInStock;
  final VoidCallback? onTap;

  const _VariantChip({
    required this.label,
    required this.isSelected,
    required this.isEnabled,
    required this.isInStock,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final outOfStock = isEnabled && !isInStock;

    return InkWell(
      onTap: outOfStock ? null : onTap,
      borderRadius: BorderRadius.circular(AppRadius.sm),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.surface,
          border: Border.all(
            color: isSelected
                ? AppColors.primary
                : isEnabled
                    ? AppColors.border
                    : AppColors.border.withAlpha(80),
          ),
          borderRadius: BorderRadius.circular(AppRadius.sm),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Text(
              label,
              style: AppTextStyles.bodySmall.copyWith(
                color: isSelected
                    ? Colors.white
                    : isEnabled
                        ? AppColors.textPrimary
                        : AppColors.textSecondary.withAlpha(100),
                fontWeight:
                    isSelected ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
            // Strike-through for out-of-stock chips
            if (outOfStock)
              Positioned.fill(
                child: Center(
                  child: Container(
                    height: 1,
                    color: AppColors.textSecondary.withAlpha(120),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
