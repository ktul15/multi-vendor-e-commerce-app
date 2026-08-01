import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/product.dart';
import '../../../shared/models/product_category.dart';

/// Dialog for creating or editing a product.
/// Returns a [ProductFormResult] on submit, null on cancel.
class ProductFormDialog extends StatefulWidget {
  const ProductFormDialog({
    super.key,
    this.product,
    this.categories = const [],
  });

  /// When non-null, the form is pre-filled for editing.
  final Product? product;
  final List<CategoryOption> categories;

  @override
  State<ProductFormDialog> createState() => _ProductFormDialogState();
}

class _ProductFormDialogState extends State<ProductFormDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameCtrl;
  late final TextEditingController _descCtrl;
  late final TextEditingController _priceCtrl;
  late final List<_VariantControllers> _variants;
  late String? _categoryId;
  late bool _isActive;

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    _nameCtrl = TextEditingController(text: p?.name ?? '');
    _descCtrl = TextEditingController(text: p?.description ?? '');
    _priceCtrl = TextEditingController(
      text: p != null ? p.basePrice.toStringAsFixed(2) : '',
    );
    _variants = p != null && p.variants.isNotEmpty
        ? p.variants.map(_VariantControllers.fromVariant).toList()
        : [_VariantControllers(price: p?.basePrice.toStringAsFixed(2) ?? '')];
    _categoryId = p?.categoryId;
    _isActive = p?.isActive ?? true;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _priceCtrl.dispose();
    for (final variant in _variants) {
      variant.dispose();
    }
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      Navigator.of(context).pop(
        ProductFormResult(
          name: _nameCtrl.text.trim(),
          description: _descCtrl.text.trim(),
          basePrice: double.parse(_priceCtrl.text.trim()),
          categoryId: _categoryId,
          isActive: _isActive,
          variants: _variants.map((variant) => variant.toDraft()).toList(),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.product != null;
    return AlertDialog(
      title: Text(isEdit ? 'Edit Product' : 'New Product'),
      content: SizedBox(
        width: 480,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: _nameCtrl,
                  decoration: const InputDecoration(labelText: 'Product Name'),
                  validator: (v) => (v == null || v.trim().length < 2)
                      ? 'Min 2 characters'
                      : null,
                ),
                const SizedBox(height: AppSpacing.md),
                TextFormField(
                  controller: _descCtrl,
                  decoration: const InputDecoration(labelText: 'Description'),
                  maxLines: 3,
                  validator: (v) => (v == null || v.trim().length < 10)
                      ? 'Min 10 characters'
                      : null,
                ),
                const SizedBox(height: AppSpacing.md),
                TextFormField(
                  controller: _priceCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Base Price',
                    prefixText: '₹',
                  ),
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(
                      RegExp(r'^\d*\.?\d{0,2}'),
                    ),
                  ],
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Required';
                    final parsed = double.tryParse(v);
                    if (parsed == null || parsed <= 0) {
                      return 'Price must be greater than ₹0';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.md),
                if (!isEdit)
                  DropdownButtonFormField<String>(
                    initialValue: _categoryId,
                    isExpanded: true,
                    menuMaxHeight: 360,
                    borderRadius: BorderRadius.circular(12),
                    decoration: const InputDecoration(labelText: 'Category'),
                    items: widget.categories
                        .map(
                          (category) => DropdownMenuItem(
                            value: category.id,
                            child: _CategoryMenuItem(category: category),
                          ),
                        )
                        .toList(),
                    selectedItemBuilder: (context) => widget.categories
                        .map(
                          (category) => Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              category.label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (value) => setState(() => _categoryId = value),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please select a category';
                      }
                      return null;
                    },
                  ),
                const SizedBox(height: AppSpacing.md),
                _buildInventorySection(),
                const SizedBox(height: AppSpacing.md),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Active'),
                  value: _isActive,
                  onChanged: (val) => setState(() => _isActive = val),
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _submit,
          child: Text(isEdit ? 'Save Changes' : 'Create'),
        ),
      ],
    );
  }

  Widget _buildInventorySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Inventory variants',
                style: AppTextStyles.body1.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            TextButton.icon(
              onPressed: _addVariant,
              icon: const Icon(Icons.add_rounded, size: 18),
              label: const Text('Add variant'),
            ),
          ],
        ),
        Text(
          'Every product needs at least one SKU. Size and color are optional.',
          style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: AppSpacing.sm),
        for (var index = 0; index < _variants.length; index++) ...[
          _VariantFields(
            key: ValueKey(_variants[index]),
            index: index,
            controllers: _variants[index],
            canRemove: _variants.length > 1 && _variants[index].id == null,
            skuValidator: _validateSku,
            onRemove: () => _removeVariant(index),
          ),
          if (index < _variants.length - 1)
            const SizedBox(height: AppSpacing.sm),
        ],
      ],
    );
  }

  void _addVariant() {
    setState(() {
      _variants.add(_VariantControllers(price: _priceCtrl.text.trim()));
    });
  }

  void _removeVariant(int index) {
    final removed = _variants.removeAt(index);
    removed.dispose();
    setState(() {});
  }

  String? _validateSku(String? value) {
    final sku = value?.trim() ?? '';
    if (sku.isEmpty) return 'SKU is required';
    final occurrences = _variants
        .where((variant) => variant.sku.text.trim() == sku)
        .length;
    return occurrences > 1 ? 'SKU must be unique' : null;
  }
}

class _VariantFields extends StatelessWidget {
  const _VariantFields({
    super.key,
    required this.index,
    required this.controllers,
    required this.canRemove,
    required this.skuValidator,
    required this.onRemove,
  });

  final int index;
  final _VariantControllers controllers;
  final bool canRemove;
  final String? Function(String?) skuValidator;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.background,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Variant ${index + 1}',
                  style: AppTextStyles.body2.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              if (canRemove)
                IconButton(
                  tooltip: 'Remove variant',
                  visualDensity: VisualDensity.compact,
                  onPressed: onRemove,
                  icon: const Icon(Icons.close_rounded, size: 19),
                ),
            ],
          ),
          TextFormField(
            controller: controllers.sku,
            decoration: const InputDecoration(
              labelText: 'SKU',
              hintText: 'e.g. TSHIRT-BLUE-M',
            ),
            textCapitalization: TextCapitalization.characters,
            validator: skuValidator,
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: controllers.price,
                  decoration: const InputDecoration(
                    labelText: 'Price',
                    prefixText: '₹',
                  ),
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(
                      RegExp(r'^\d*\.?\d{0,2}'),
                    ),
                  ],
                  validator: (value) {
                    final price = double.tryParse(value?.trim() ?? '');
                    return price == null || price < 0
                        ? 'Enter a valid price'
                        : null;
                  },
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: TextFormField(
                  controller: controllers.stock,
                  decoration: const InputDecoration(labelText: 'Stock'),
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  validator: (value) =>
                      int.tryParse(value?.trim() ?? '') == null
                      ? 'Enter stock'
                      : null,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: controllers.size,
                  decoration: const InputDecoration(
                    labelText: 'Size (optional)',
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: TextFormField(
                  controller: controllers.color,
                  decoration: const InputDecoration(
                    labelText: 'Color (optional)',
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _VariantControllers {
  _VariantControllers({
    this.id,
    String sku = '',
    String price = '',
    String stock = '0',
    String size = '',
    String color = '',
  }) : sku = TextEditingController(text: sku),
       price = TextEditingController(text: price),
       stock = TextEditingController(text: stock),
       size = TextEditingController(text: size),
       color = TextEditingController(text: color);

  factory _VariantControllers.fromVariant(ProductVariant variant) {
    return _VariantControllers(
      id: variant.id,
      sku: variant.sku,
      price: variant.price.toStringAsFixed(2),
      stock: variant.stock.toString(),
      size: variant.size ?? '',
      color: variant.color ?? '',
    );
  }

  final String? id;
  final TextEditingController sku;
  final TextEditingController price;
  final TextEditingController stock;
  final TextEditingController size;
  final TextEditingController color;

  ProductVariantDraft toDraft() => ProductVariantDraft(
    id: id,
    sku: sku.text.trim(),
    price: double.parse(price.text.trim()),
    stock: int.parse(stock.text.trim()),
    size: size.text.trim().isEmpty ? null : size.text.trim(),
    color: color.text.trim().isEmpty ? null : color.text.trim(),
  );

  void dispose() {
    sku.dispose();
    price.dispose();
    stock.dispose();
    size.dispose();
    color.dispose();
  }
}

class _CategoryMenuItem extends StatelessWidget {
  const _CategoryMenuItem({required this.category});

  final CategoryOption category;

  @override
  Widget build(BuildContext context) {
    final isRoot = category.depth == 0;

    return Row(
      children: [
        SizedBox(width: category.depth * 18.0),
        if (!isRoot) ...[
          const Icon(
            Icons.subdirectory_arrow_right_rounded,
            size: 17,
            color: AppColors.neutral500,
          ),
          const SizedBox(width: AppSpacing.xs),
        ],
        Icon(
          category.hasChildren ? Icons.folder_outlined : Icons.sell_outlined,
          size: 19,
          color: isRoot ? AppColors.primary : AppColors.neutral500,
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Text(
            category.name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: isRoot
                ? AppTextStyles.body2.copyWith(fontWeight: FontWeight.w700)
                : AppTextStyles.body2,
          ),
        ),
        if (category.hasChildren) ...[
          const SizedBox(width: AppSpacing.sm),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: AppColors.primary.withAlpha(18),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              isRoot ? 'Parent' : 'Group',
              style: AppTextStyles.caption.copyWith(
                color: AppColors.primaryDark,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class ProductFormResult {
  final String name;
  final String description;
  final double basePrice;
  final String? categoryId;
  final bool isActive;
  final List<ProductVariantDraft> variants;

  const ProductFormResult({
    required this.name,
    required this.description,
    required this.basePrice,
    required this.categoryId,
    required this.isActive,
    required this.variants,
  });
}
