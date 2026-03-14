import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

/// Shows a confirmation dialog before deleting [categoryName].
/// Returns true if the user confirms, false/null otherwise.
Future<bool?> showDeleteConfirmDialog(
  BuildContext context, {
  required String categoryName,
}) {
  return showDialog<bool>(
    context: context,
    builder: (context) => _DeleteConfirmDialog(categoryName: categoryName),
  );
}

class _DeleteConfirmDialog extends StatelessWidget {
  final String categoryName;

  const _DeleteConfirmDialog({required this.categoryName});

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Delete Category'),
      content: RichText(
        text: TextSpan(
          style: Theme.of(context).textTheme.bodyMedium,
          children: [
            const TextSpan(text: 'Are you sure you want to delete '),
            TextSpan(
              text: '"$categoryName"',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            const TextSpan(
              text:
                  '?\n\nChild categories will also be removed. This action cannot be undone.',
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: AppColors.error),
          onPressed: () => Navigator.of(context).pop(true),
          child: const Text('Delete'),
        ),
      ],
    );
  }
}
