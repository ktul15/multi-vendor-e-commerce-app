import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/address_model.dart';
import '../bloc/address_management_cubit.dart';
import '../bloc/address_management_state.dart';

/// Bottom sheet form for adding or editing a delivery address.
///
/// Pass [initial] to pre-fill fields and switch to edit mode.
/// Stays open while the network request is in-flight; auto-dismisses on
/// success and shows an inline error banner on failure.
class AddressFormSheet extends StatefulWidget {
  /// When non-null the form is in edit mode and fields are pre-filled.
  final AddressModel? initial;

  const AddressFormSheet({super.key, this.initial});

  @override
  State<AddressFormSheet> createState() => _AddressFormSheetState();
}

class _AddressFormSheetState extends State<AddressFormSheet> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _fullNameCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _streetCtrl;
  late final TextEditingController _cityCtrl;
  late final TextEditingController _stateCtrl;
  late final TextEditingController _countryCtrl;
  late final TextEditingController _zipCodeCtrl;

  /// Tracks whether the user has submitted so the BlocListener only reacts
  /// to state changes triggered by *this* submission.
  bool _hasSubmitted = false;

  bool get _isEditMode => widget.initial != null;

  @override
  void initState() {
    super.initState();
    final a = widget.initial;
    _fullNameCtrl = TextEditingController(text: a?.fullName ?? '');
    _phoneCtrl = TextEditingController(text: a?.phone ?? '');
    _streetCtrl = TextEditingController(text: a?.street ?? '');
    _cityCtrl = TextEditingController(text: a?.city ?? '');
    _stateCtrl = TextEditingController(text: a?.state ?? '');
    _countryCtrl = TextEditingController(text: a?.country ?? '');
    _zipCodeCtrl = TextEditingController(text: a?.zipCode ?? '');
  }

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
    final cubit = context.read<AddressManagementCubit>();
    if (_isEditMode) {
      cubit.updateAddress(
        widget.initial!.id,
        fullName: _fullNameCtrl.text.trim(),
        phone: _phoneCtrl.text.trim(),
        street: _streetCtrl.text.trim(),
        city: _cityCtrl.text.trim(),
        state: _stateCtrl.text.trim(),
        country: _countryCtrl.text.trim().toUpperCase(),
        zipCode: _zipCodeCtrl.text.trim(),
      );
    } else {
      cubit.addAddress(
        fullName: _fullNameCtrl.text.trim(),
        phone: _phoneCtrl.text.trim(),
        street: _streetCtrl.text.trim(),
        city: _cityCtrl.text.trim(),
        state: _stateCtrl.text.trim(),
        country: _countryCtrl.text.trim().toUpperCase(),
        zipCode: _zipCodeCtrl.text.trim(),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AddressManagementCubit, AddressManagementState>(
      listenWhen: (prev, curr) =>
          _hasSubmitted &&
          prev is AddressManagementLoaded &&
          prev.isBusy &&
          curr is AddressManagementLoaded &&
          !curr.isBusy,
      listener: (context, state) {
        if (state is AddressManagementLoaded && state.error == null) {
          Navigator.of(context).pop();
        } else {
          setState(() => _hasSubmitted = false);
        }
      },
      builder: (context, state) {
        final isLoading = _hasSubmitted &&
            state is AddressManagementLoaded &&
            state.isBusy;
        final error =
            (!isLoading && state is AddressManagementLoaded) ? state.error : null;

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
                Text(
                  _isEditMode ? 'Edit Address' : 'Add New Address',
                  style: AppTextStyles.h5,
                ),
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
                      style: AppTextStyles.caption
                          .copyWith(color: AppColors.error),
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
                    if (!RegExp(r'^\+?[\d\s\-]{7,}$').hasMatch(v.trim())) {
                      return 'Enter a valid phone number';
                    }
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
                      : Text(_isEditMode ? 'Save Changes' : 'Save Address'),
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
