import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

class VendorStatusBadge extends StatelessWidget {
  final String status;

  const VendorStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final color = _colorFor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withAlpha(80)),
      ),
      child: Text(
        status,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
      ),
    );
  }

  static Color _colorFor(String status) => switch (status) {
        'APPROVED' => AppColors.success,
        'PENDING' => AppColors.warning,
        'REJECTED' => AppColors.error,
        'SUSPENDED' => AppColors.textSecondary,
        _ => AppColors.textSecondary,
      };
}
