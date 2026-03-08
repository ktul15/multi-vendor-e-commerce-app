import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/product_filters.dart';

/// Modal bottom sheet for selecting sort order.
class SortBottomSheet extends StatelessWidget {
  final ProductSort current;
  final ValueChanged<ProductSort> onSelected;

  const SortBottomSheet({
    super.key,
    required this.current,
    required this.onSelected,
  });

  static Future<void> show(
    BuildContext context, {
    required ProductSort current,
    required ValueChanged<ProductSort> onSelected,
  }) {
    return showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      ),
      builder: (_) => SortBottomSheet(current: current, onSelected: onSelected),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.base,
              AppSpacing.base,
              AppSpacing.base,
              AppSpacing.sm,
            ),
            child: Text('Sort by', style: AppTextStyles.h5),
          ),
          ...ProductSort.values.map(
            (sort) => RadioListTile<ProductSort>(
              value: sort,
              groupValue: current,
              title: Text(sort.label, style: AppTextStyles.body),
              activeColor: AppColors.primary,
              onChanged: (value) {
                Navigator.of(context).pop();
                if (value != null) onSelected(value);
              },
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
        ],
      ),
    );
  }
}
