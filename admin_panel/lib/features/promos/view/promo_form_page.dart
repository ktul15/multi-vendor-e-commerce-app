import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../bloc/promo_cubit.dart';
import '../bloc/promo_state.dart';
import '../models/promo_model.dart';

/// Add / edit page for a single promo code.
/// Receives its [PromoCubit] via [BlocProvider.value] from the router.
class PromoFormPage extends StatefulWidget {
  /// Non-null when editing an existing promo code.
  final String? promoId;

  const PromoFormPage({super.key, this.promoId});

  bool get isEditing => promoId != null;

  @override
  State<PromoFormPage> createState() => _PromoFormPageState();
}

class _PromoFormPageState extends State<PromoFormPage> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _codeController;
  late final TextEditingController _discountValueController;
  late final TextEditingController _minOrderController;
  late final TextEditingController _maxDiscountController;
  late final TextEditingController _usageLimitController;
  late final TextEditingController _perUserLimitController;

  String _discountType = 'PERCENTAGE';
  bool _isActive = true;
  DateTime? _expiresAt;
  bool _isSaving = false;
  bool _formPopulated = false;

  // Track whether optional fields had values (for clearX flags on update).
  bool _hadMinOrder = false;
  bool _hadMaxDiscount = false;
  bool _hadUsageLimit = false;
  bool _hadPerUserLimit = false;
  bool _hadExpiresAt = false;

  @override
  void initState() {
    super.initState();
    _codeController = TextEditingController();
    _discountValueController = TextEditingController();
    _minOrderController = TextEditingController();
    _maxDiscountController = TextEditingController();
    _usageLimitController = TextEditingController();
    _perUserLimitController = TextEditingController();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_formPopulated || !widget.isEditing) return;

    final state = context.read<PromoCubit>().state;
    if (state is PromoLoaded || state is PromoError) {
      _loadFromState();
    } else if (state is PromoInitial) {
      context.read<PromoCubit>().load();
    }
  }

  void _loadFromState() {
    final state = context.read<PromoCubit>().state;
    if (state is PromoError) {
      // Data failed to load — navigate back with an error so the user isn't
      // stuck on a blank form with no feedback.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load promo code: ${state.message}'),
            backgroundColor: AppColors.error,
          ),
        );
      });
      return;
    }
    final items = switch (state) {
      PromoLoaded() => state.items,
      _ => <PromoModel>[],
    };
    final promo = items.where((p) => p.id == widget.promoId).firstOrNull;
    if (promo == null) return;

    _codeController.text = promo.code;
    _discountValueController.text = promo.discountValue.toStringAsFixed(
      promo.discountValue % 1 == 0 ? 0 : 2,
    );
    if (promo.minOrderValue != null) {
      _minOrderController.text =
          promo.minOrderValue!.toStringAsFixed(2);
    }
    if (promo.maxDiscount != null) {
      _maxDiscountController.text =
          promo.maxDiscount!.toStringAsFixed(2);
    }
    if (promo.usageLimit != null) {
      _usageLimitController.text = promo.usageLimit.toString();
    }
    if (promo.perUserLimit != null) {
      _perUserLimitController.text = promo.perUserLimit.toString();
    }

    setState(() {
      _discountType = promo.discountType;
      _isActive = promo.isActive;
      _expiresAt = promo.expiresAt;
      _hadMinOrder = promo.minOrderValue != null;
      _hadMaxDiscount = promo.maxDiscount != null;
      _hadUsageLimit = promo.usageLimit != null;
      _hadPerUserLimit = promo.perUserLimit != null;
      _hadExpiresAt = promo.expiresAt != null;
      _formPopulated = true;
    });
  }

  @override
  void dispose() {
    _codeController.dispose();
    _discountValueController.dispose();
    _minOrderController.dispose();
    _maxDiscountController.dispose();
    _usageLimitController.dispose();
    _perUserLimitController.dispose();
    super.dispose();
  }

  Future<void> _pickExpiryDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _expiresAt ?? now.add(const Duration(days: 30)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365 * 5)),
    );
    if (picked != null) {
      setState(() => _expiresAt = picked);
    }
  }

  Future<void> _onSave() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    final code = _codeController.text.trim().toUpperCase();
    final discountValue = double.tryParse(_discountValueController.text.trim()) ?? 0;
    final minOrder = _minOrderController.text.trim().isEmpty
        ? null
        : double.tryParse(_minOrderController.text.trim());
    final maxDiscount = _maxDiscountController.text.trim().isEmpty
        ? null
        : double.tryParse(_maxDiscountController.text.trim());
    final usageLimit = _usageLimitController.text.trim().isEmpty
        ? null
        : int.tryParse(_usageLimitController.text.trim());
    final perUserLimit = _perUserLimitController.text.trim().isEmpty
        ? null
        : int.tryParse(_perUserLimitController.text.trim());

    String? error;
    if (widget.isEditing) {
      error = await context.read<PromoCubit>().updatePromo(
            widget.promoId!,
            code: code,
            discountType: _discountType,
            discountValue: discountValue,
            minOrderValue: minOrder,
            maxDiscount: maxDiscount,
            usageLimit: usageLimit,
            perUserLimit: perUserLimit,
            isActive: _isActive,
            expiresAt: _expiresAt,
            clearMinOrderValue: _hadMinOrder && minOrder == null,
            clearMaxDiscount: _hadMaxDiscount && maxDiscount == null,
            clearUsageLimit: _hadUsageLimit && usageLimit == null,
            clearPerUserLimit: _hadPerUserLimit && perUserLimit == null,
            clearExpiresAt: _hadExpiresAt && _expiresAt == null,
          );
    } else {
      error = await context.read<PromoCubit>().createPromo(
            code: code,
            discountType: _discountType,
            discountValue: discountValue,
            minOrderValue: minOrder,
            maxDiscount: maxDiscount,
            usageLimit: usageLimit,
            perUserLimit: perUserLimit,
            isActive: _isActive,
            expiresAt: _expiresAt,
          );
    }

    if (!mounted) return;
    setState(() => _isSaving = false);

    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error),
          backgroundColor: AppColors.error,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            widget.isEditing
                ? 'Promo code updated successfully'
                : 'Promo code created successfully',
          ),
        ),
      );
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: Text(widget.isEditing ? 'Edit Promo Code' : 'Add Promo Code'),
      ),
      body: BlocConsumer<PromoCubit, PromoState>(
        listenWhen: (prev, next) =>
            widget.isEditing &&
            !_formPopulated &&
            (next is PromoLoaded || next is PromoError),
        listener: (context, state) => _loadFromState(),
        builder: (context, state) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 560),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.isEditing
                                ? 'Edit Promo Code'
                                : 'New Promo Code',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 24),

                          // ── Code ──────────────────────────────────────
                          TextFormField(
                            controller: _codeController,
                            decoration: const InputDecoration(
                              labelText: 'Code *',
                              hintText: 'e.g. SAVE10',
                              helperText: 'Will be stored in uppercase',
                            ),
                            textCapitalization: TextCapitalization.characters,
                            textInputAction: TextInputAction.next,
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) {
                                return 'Code is required';
                              }
                              if (v.trim().length < 3) {
                                return 'Code must be at least 3 characters';
                              }
                              if (v.trim().length > 30) {
                                return 'Code must be 30 characters or fewer';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),

                          // ── Discount type ─────────────────────────────
                          Text(
                            'Discount Type *',
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 8),
                          SegmentedButton<String>(
                            segments: const [
                              ButtonSegment(
                                value: 'PERCENTAGE',
                                icon: Icon(Icons.percent_rounded, size: 16),
                                label: Text('Percentage'),
                              ),
                              ButtonSegment(
                                value: 'FIXED',
                                icon: Icon(Icons.attach_money_rounded, size: 16),
                                label: Text('Fixed Amount'),
                              ),
                            ],
                            selected: {_discountType},
                            onSelectionChanged: (s) =>
                                setState(() => _discountType = s.first),
                          ),
                          const SizedBox(height: 20),

                          // ── Discount value ────────────────────────────
                          TextFormField(
                            controller: _discountValueController,
                            decoration: InputDecoration(
                              labelText: 'Discount Value *',
                              hintText: _discountType == 'PERCENTAGE'
                                  ? '10 (for 10%)'
                                  : '5.00',
                              prefixText: _discountType == 'FIXED' ? '\$ ' : null,
                              suffixText:
                                  _discountType == 'PERCENTAGE' ? '%' : null,
                            ),
                            textInputAction: TextInputAction.next,
                            keyboardType: const TextInputType.numberWithOptions(
                                decimal: true),
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) {
                                return 'Discount value is required';
                              }
                              final d = double.tryParse(v.trim());
                              if (d == null || d <= 0) {
                                return 'Must be a positive number';
                              }
                              if (_discountType == 'PERCENTAGE' && d > 100) {
                                return 'Percentage cannot exceed 100';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),

                          // ── Optional fields section ───────────────────
                          Text(
                            'Optional Constraints',
                            style: Theme.of(context)
                                .textTheme
                                .titleSmall
                                ?.copyWith(color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 12),

                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: _minOrderController,
                                  decoration: const InputDecoration(
                                    labelText: 'Min Order Value',
                                    hintText: '50.00',
                                    prefixText: '\$ ',
                                    helperText: 'Leave blank for no minimum',
                                  ),
                                  textInputAction: TextInputAction.next,
                                  keyboardType: const TextInputType.numberWithOptions(
                                      decimal: true),
                                  validator: (v) {
                                    if (v == null || v.trim().isEmpty) return null;
                                    if (double.tryParse(v.trim()) == null) {
                                      return 'Invalid amount';
                                    }
                                    return null;
                                  },
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: TextFormField(
                                  controller: _maxDiscountController,
                                  decoration: const InputDecoration(
                                    labelText: 'Max Discount',
                                    hintText: '20.00',
                                    prefixText: '\$ ',
                                    helperText: 'Leave blank for no cap',
                                  ),
                                  textInputAction: TextInputAction.next,
                                  keyboardType: const TextInputType.numberWithOptions(
                                      decimal: true),
                                  validator: (v) {
                                    if (v == null || v.trim().isEmpty) return null;
                                    if (double.tryParse(v.trim()) == null) {
                                      return 'Invalid amount';
                                    }
                                    return null;
                                  },
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: _usageLimitController,
                                  decoration: const InputDecoration(
                                    labelText: 'Total Usage Limit',
                                    hintText: '100',
                                    helperText: 'Leave blank for unlimited',
                                  ),
                                  textInputAction: TextInputAction.next,
                                  keyboardType: TextInputType.number,
                                  validator: (v) {
                                    if (v == null || v.trim().isEmpty) return null;
                                    final i = int.tryParse(v.trim());
                                    if (i == null || i <= 0) {
                                      return 'Must be a positive integer';
                                    }
                                    return null;
                                  },
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: TextFormField(
                                  controller: _perUserLimitController,
                                  decoration: const InputDecoration(
                                    labelText: 'Per-User Limit',
                                    hintText: '1',
                                    helperText: 'Leave blank for unlimited',
                                  ),
                                  textInputAction: TextInputAction.done,
                                  keyboardType: TextInputType.number,
                                  validator: (v) {
                                    if (v == null || v.trim().isEmpty) return null;
                                    final i = int.tryParse(v.trim());
                                    if (i == null || i <= 0) {
                                      return 'Must be a positive integer';
                                    }
                                    return null;
                                  },
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),

                          // ── Expiry date ───────────────────────────────
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _pickExpiryDate,
                                  icon: const Icon(
                                      Icons.calendar_today_outlined,
                                      size: 16),
                                  label: Text(
                                    _expiresAt != null
                                        ? 'Expires: ${DateFormat('MMM d, y').format(_expiresAt!)}'
                                        : 'Set Expiry Date (optional)',
                                  ),
                                ),
                              ),
                              if (_expiresAt != null) ...[
                                const SizedBox(width: 8),
                                IconButton(
                                  tooltip: 'Clear expiry',
                                  icon: const Icon(Icons.clear_rounded,
                                      size: 18),
                                  onPressed: () =>
                                      setState(() => _expiresAt = null),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 20),

                          // ── Active toggle ─────────────────────────────
                          Row(
                            children: [
                              Switch(
                                value: _isActive,
                                onChanged: (v) =>
                                    setState(() => _isActive = v),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                _isActive ? 'Active' : 'Inactive',
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            ],
                          ),
                          const SizedBox(height: 32),

                          // ── Save button ───────────────────────────────
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: _isSaving ? null : _onSave,
                              child: _isSaving
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : Text(
                                      widget.isEditing
                                          ? 'Save Changes'
                                          : 'Create Promo Code',
                                    ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
