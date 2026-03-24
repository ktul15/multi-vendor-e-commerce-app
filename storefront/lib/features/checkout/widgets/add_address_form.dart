import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../bloc/checkout_bloc.dart';
import '../bloc/checkout_event.dart';
import '../bloc/checkout_state.dart';

/// Modal bottom sheet form for adding a new delivery address.
///
/// Stays open while the network request is in-flight. Only dismisses
/// automatically on success; shows an inline error banner on failure so the
/// user's form data is preserved.
class AddAddressSheet extends StatefulWidget {
  const AddAddressSheet({super.key});

  @override
  State<AddAddressSheet> createState() => _AddAddressSheetState();
}

class _AddAddressSheetState extends State<AddAddressSheet> {
  final _formKey = GlobalKey<FormState>();

  final _fullNameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _streetCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _stateCtrl = TextEditingController();
  final _countryCtrl = TextEditingController();
  final _zipCodeCtrl = TextEditingController();

  /// Tracks whether the user has submitted the form so the BlocListener only
  /// reacts to state changes triggered by *this* submission.
  bool _hasSubmitted = false;

  @override
  void dispose() {
    _fullNameCtrl.dispose();
    _phoneCtrl.dispose();
    _streetCtrl.dispose();
    _cityCtrl.dispose();
    _stateCtrl.dispose();
    _countryCtrl.dispose();
    _zipCodeCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _hasSubmitted = true);
    context.read<CheckoutBloc>().add(
          CheckoutAddressAdded(
            fullName: _fullNameCtrl.text.trim(),
            phone: _phoneCtrl.text.trim(),
            street: _streetCtrl.text.trim(),
            city: _cityCtrl.text.trim(),
            state: _stateCtrl.text.trim(),
            country: _countryCtrl.text.trim().toUpperCase(),
            zipCode: _zipCodeCtrl.text.trim(),
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<CheckoutBloc, CheckoutState>(
      listenWhen: (prev, curr) =>
          _hasSubmitted &&
          prev is CheckoutAddressStep &&
          prev.isAddingAddress &&
          curr is CheckoutAddressStep &&
          !curr.isAddingAddress,
      listener: (context, state) {
        if (state is CheckoutAddressStep && state.error == null) {
          // Success — dismiss the sheet.
          Navigator.of(context).pop();
        } else {
          // Failure — stay open, the form body shows the error banner.
          setState(() => _hasSubmitted = false);
        }
      },
      builder: (context, state) {
        final isLoading =
            _hasSubmitted && state is CheckoutAddressStep && state.isAddingAddress;
        final error = (!isLoading && state is CheckoutAddressStep)
            ? state.error
            : null;

        return Padding(
          padding: EdgeInsets.only(
            left: AppSpacing.base,
            right: AppSpacing.base,
            top: AppSpacing.base,
            bottom: MediaQuery.viewInsetsOf(context).bottom + AppSpacing.xl,
          ),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Handle bar
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.border,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.base),
                Text('Add New Address', style: AppTextStyles.h5),
                if (error != null) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: AppColors.error.withAlpha(25),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      error,
                      style:
                          AppTextStyles.caption.copyWith(color: AppColors.error),
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.base),
                _field(
                  controller: _fullNameCtrl,
                  label: 'Full Name',
                  capitalization: TextCapitalization.words,
                  validator: _required,
                ),
                const SizedBox(height: AppSpacing.md),
                _field(
                  controller: _phoneCtrl,
                  label: 'Phone',
                  keyboardType: TextInputType.phone,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Required';
                    if (v.trim().length < 7) return 'At least 7 digits';
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.md),
                _field(
                  controller: _streetCtrl,
                  label: 'Street',
                  capitalization: TextCapitalization.words,
                  validator: _required,
                ),
                const SizedBox(height: AppSpacing.md),
                Row(
                  children: [
                    Expanded(
                      child: _field(
                        controller: _cityCtrl,
                        label: 'City',
                        capitalization: TextCapitalization.words,
                        validator: _required,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: _field(
                        controller: _stateCtrl,
                        label: 'State',
                        capitalization: TextCapitalization.words,
                        validator: _required,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Row(
                  children: [
                    Expanded(
                      child: _field(
                        controller: _countryCtrl,
                        label: 'Country (2-letter)',
                        // No word-capitalization — the .toUpperCase() call on
                        // submit handles this; auto-cap would conflict with
                        // numeric/special keyboards on some platforms.
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return 'Required';
                          if (!RegExp(r'^[a-zA-Z]{2}$').hasMatch(v.trim())) {
                            return '2-letter ISO code (e.g. US)';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: _field(
                        controller: _zipCodeCtrl,
                        label: 'Zip Code',
                        keyboardType: TextInputType.number,
                        validator: _required,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xl),
                ElevatedButton(
                  onPressed: isLoading ? null : _submit,
                  child: isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Save Address'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    TextInputType? keyboardType,
    TextCapitalization capitalization = TextCapitalization.none,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      textCapitalization: capitalization,
      decoration: InputDecoration(labelText: label),
      validator: validator,
    );
  }

  String? _required(String? v) =>
      (v == null || v.trim().isEmpty) ? 'Required' : null;
}
