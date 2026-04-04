import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/top_product.dart';

class TopProductsTable extends StatelessWidget {
  const TopProductsTable({super.key, required this.products});

  final List<TopProduct> products;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Top Products', style: AppTextStyles.h3),
            const SizedBox(height: AppSpacing.md),
            if (products.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(AppSpacing.lg),
                  child: Text('No product data available.'),
                ),
              )
            else
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  headingRowColor:
                      WidgetStateProperty.all(AppColors.background),
                  columns: const [
                    DataColumn(label: Text('Rank'), numeric: true),
                    DataColumn(label: Text('Product')),
                    DataColumn(label: Text('Orders'), numeric: true),
                    DataColumn(label: Text('Revenue'), numeric: true),
                  ],
                  rows: products.map((p) {
                    return DataRow(
                      cells: [
                        DataCell(Text('#${p.rank}')),
                        DataCell(
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 200),
                            child: Text(
                              p.productName,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                        DataCell(Text(p.orderCount.toString())),
                        DataCell(
                          Text('\$${p.totalRevenue.toStringAsFixed(2)}'),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
