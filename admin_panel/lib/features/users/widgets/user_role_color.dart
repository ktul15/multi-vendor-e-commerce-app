import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

/// Returns the display color for a given user role string.
/// Used by [UserRow] and [UserDetailPage].
Color roleColor(String role) {
  return switch (role) {
    'ADMIN' => AppColors.error,
    'VENDOR' => AppColors.success,
    _ => AppColors.info,
  };
}
