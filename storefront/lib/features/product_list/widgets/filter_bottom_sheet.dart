import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/product_filters.dart';

/// Modal bottom sheet for applying product filters (price, rating, stock).
class FilterBottomSheet extends StatefulWidget {
  final ProductFilters current;
  final ValueChanged<ProductFilters> onApply;

  /// Upper bound of the price range slider. Pass the actual catalogue maximum
  /// when known; defaults to 5000 as a reasonable fallback.
  final double maxPrice;

  const FilterBottomSheet({
    super.key,
    required this.current,
    required this.onApply,
    this.maxPrice = 5000,
  });

  static Future<void> show(
    BuildContext context, {
    required ProductFilters current,
    required ValueChanged<ProductFilters> onApply,
    double maxPrice = 5000,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      ),
      builder: (_) => FilterBottomSheet(
        current: current,
        onApply: onApply,
        maxPrice: maxPrice,
      ),
    );
  }

  @override
  State<FilterBottomSheet> createState() => _FilterBottomSheetState();
}

class _FilterBottomSheetState extends State<FilterBottomSheet> {
  late RangeValues _priceRange;
  late double? _minRating;
  late bool? _inStock;

  @override
  void initState() {
    super.initState();
    _priceRange = RangeValues(
      widget.current.minPrice ?? 0,
      widget.current.maxPrice ?? widget.maxPrice,
    );
    _minRating = widget.current.minRating;
    _inStock = widget.current.inStock;
  }

  bool get _isPriceFiltered =>
      _priceRange.start > 0 || _priceRange.end < widget.maxPrice;

  void _reset() => setState(() {
        _priceRange = RangeValues(0, widget.maxPrice);
        _minRating = null;
        _inStock = null;
      });

  void _apply() {
    Navigator.of(context).pop();
    widget.onApply(
      widget.current.copyWith(
        minPrice: _isPriceFiltered ? _priceRange.start : null,
        maxPrice: _isPriceFiltered ? _priceRange.end : null,
        clearMinPrice: !_isPriceFiltered,
        clearMaxPrice: !_isPriceFiltered,
        minRating: _minRating,
        clearMinRating: _minRating == null,
        inStock: _inStock,
        clearInStock: _inStock == null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.base,
                AppSpacing.base,
                AppSpacing.sm,
                0,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Filters', style: AppTextStyles.h5),
                  TextButton(
                    onPressed: _reset,
                    child: Text(
                      'Reset',
                      style: AppTextStyles.body.copyWith(
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),

            // Price range
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.base,
                AppSpacing.md,
                AppSpacing.base,
                0,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Price Range', style: AppTextStyles.h6),
                      Text(
                        '\$${_priceRange.start.toStringAsFixed(0)}'
                        ' – \$${_priceRange.end.toStringAsFixed(0)}',
                        style: AppTextStyles.body.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  RangeSlider(
                    values: _priceRange,
                    min: 0,
                    max: widget.maxPrice,
                    divisions: 100,
                    activeColor: AppColors.primary,
                    inactiveColor: AppColors.primary.withAlpha(51),
                    onChanged: (v) => setState(() => _priceRange = v),
                  ),
                ],
              ),
            ),

            // Minimum rating
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Minimum Rating', style: AppTextStyles.h6),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    children: List.generate(5, (i) {
                      final star = (i + 1).toDouble();
                      final selected = _minRating != null && _minRating! >= star;
                      return InkWell(
                        onTap: () => setState(() {
                          _minRating = _minRating == star ? null : star;
                        }),
                        borderRadius: BorderRadius.circular(4),
                        child: SizedBox(
                          width: 48,
                          height: 48,
                          child: Center(
                            child: Icon(
                              Icons.star_rounded,
                              size: 28,
                              color: selected
                                  ? const Color(0xFFF59E0B)
                                  : Colors.grey[300],
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                ],
              ),
            ),

            // In stock
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('In Stock Only', style: AppTextStyles.h6),
                  Switch(
                    value: _inStock ?? false,
                    activeColor: AppColors.primary,
                    onChanged: (v) =>
                        setState(() => _inStock = v ? true : null),
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.sm),
            const Divider(height: 1),

            // Apply button
            Padding(
              padding: const EdgeInsets.all(AppSpacing.base),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _apply,
                  child: const Text('Apply Filters'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
