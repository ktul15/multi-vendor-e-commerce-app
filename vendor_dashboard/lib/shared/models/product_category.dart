class ProductCategory {
  final String id;
  final String name;
  final String slug;
  final List<ProductCategory> children;

  const ProductCategory({
    required this.id,
    required this.name,
    required this.slug,
    required this.children,
  });

  factory ProductCategory.fromJson(Map<String, dynamic> json) {
    final rawChildren = json['children'] as List<dynamic>? ?? [];
    return ProductCategory(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String? ?? '',
      children: rawChildren
          .map((e) => ProductCategory.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class CategoryOption {
  final String id;
  final String label;

  const CategoryOption({required this.id, required this.label});
}

List<CategoryOption> flattenCategoryOptions(List<ProductCategory> categories) {
  final options = <CategoryOption>[];

  void addCategory(ProductCategory category, List<String> parents) {
    final path = [...parents, category.name];
    options.add(CategoryOption(id: category.id, label: path.join(' / ')));

    for (final child in category.children) {
      addCategory(child, path);
    }
  }

  for (final category in categories) {
    addCategory(category, const []);
  }

  return options;
}
