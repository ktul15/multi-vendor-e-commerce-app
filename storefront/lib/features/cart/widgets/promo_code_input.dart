import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../bloc/cart_cubit.dart';
import '../bloc/cart_state.dart';

class PromoCodeInput extends StatefulWidget {
  final bool isApplyingPromo;
  final String? activePromoCode;
  final String? promoError;

  const PromoCodeInput({
    super.key,
    required this.isApplyingPromo,
    this.activePromoCode,
    this.promoError,
  });

  @override
  State<PromoCodeInput> createState() => _PromoCodeInputState();
}

class _PromoCodeInputState extends State<PromoCodeInput> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final hasActivePromo = widget.activePromoCode != null;

    return BlocListener<CartCubit, CartState>(
      // Clear the text field when a promo is successfully applied.
      listenWhen: (previous, current) =>
          previous is CartLoaded &&
          current is CartLoaded &&
          previous.promoPreview == null &&
          current.promoPreview != null,
      listener: (context, state) => _controller.clear(),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (hasActivePromo) ...[
              _ActivePromoChip(
                code: widget.activePromoCode!,
                onRemove: () => context.read<CartCubit>().clearPromo(),
              ),
            ] else ...[
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        hintText: 'Promo code',
                        isDense: true,
                        errorText: widget.promoError,
                      ),
                      enabled: !widget.isApplyingPromo,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  widget.isApplyingPromo
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : TextButton(
                          onPressed: () {
                            final code = _controller.text.trim();
                            if (code.isNotEmpty) {
                              context.read<CartCubit>().applyPromo(code);
                            }
                          },
                          child: const Text('Apply'),
                        ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ActivePromoChip extends StatelessWidget {
  final String code;
  final VoidCallback onRemove;

  const _ActivePromoChip({required this.code, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.success.withAlpha(25),
        borderRadius: BorderRadius.circular(AppSpacing.sm),
        border: Border.all(color: AppColors.success.withAlpha(100)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.check_circle_outline,
              size: 16, color: AppColors.success),
          const SizedBox(width: AppSpacing.xs),
          Text(
            '$code applied',
            style: AppTextStyles.bodySmall.copyWith(color: AppColors.success),
          ),
          const SizedBox(width: AppSpacing.sm),
          GestureDetector(
            onTap: onRemove,
            child:
                const Icon(Icons.close, size: 16, color: AppColors.success),
          ),
        ],
      ),
    );
  }
}
