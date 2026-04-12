import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

class CheckoutStepIndicator extends StatelessWidget {
  final int currentStep; // 1-indexed: 1 = Address, 2 = Summary, 3 = Payment

  const CheckoutStepIndicator({super.key, required this.currentStep})
      : assert(
          currentStep >= 1 && currentStep <= 3,
          'currentStep must be between 1 and 3',
        );

  static const _labels = ['Address', 'Summary', 'Payment'];

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(_labels.length * 2 - 1, (i) {
        if (i.isOdd) {
          // Connector line
          final stepBefore = (i ~/ 2) + 1;
          final isDone = currentStep > stepBefore;
          return Expanded(
            child: Container(
              height: 2,
              color: isDone ? AppColors.primary : AppColors.border,
            ),
          );
        }
        final step = i ~/ 2 + 1;
        final isActive = step == currentStep;
        final isDone = step < currentStep;
        return _StepCircle(
          step: step,
          label: _labels[i ~/ 2],
          isActive: isActive,
          isDone: isDone,
        );
      }),
    );
  }
}

class _StepCircle extends StatelessWidget {
  final int step;
  final String label;
  final bool isActive;
  final bool isDone;

  const _StepCircle({
    required this.step,
    required this.label,
    required this.isActive,
    required this.isDone,
  });

  @override
  Widget build(BuildContext context) {
    final color =
        (isActive || isDone) ? AppColors.primary : AppColors.textSecondary;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: (isActive || isDone) ? AppColors.primary : Colors.transparent,
            border: Border.all(color: color, width: 2),
          ),
          child: Center(
            child: isDone
                ? const Icon(Icons.check, size: 14, color: Colors.white)
                : Text(
                    '$step',
                    style: AppTextStyles.caption.copyWith(
                      color: isActive ? Colors.white : AppColors.textSecondary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: AppTextStyles.caption.copyWith(
            color: color,
            fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ],
    );
  }
}
