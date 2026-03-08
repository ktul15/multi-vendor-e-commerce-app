import 'package:equatable/equatable.dart';
import '../../../shared/models/product_model.dart';

sealed class ProductDetailState extends Equatable {
  const ProductDetailState();
}

class ProductDetailInitial extends ProductDetailState {
  const ProductDetailInitial();

  @override
  List<Object?> get props => [];
}

class ProductDetailLoading extends ProductDetailState {
  const ProductDetailLoading();

  @override
  List<Object?> get props => [];
}

class ProductDetailLoaded extends ProductDetailState {
  final ProductModel product;
  final VariantModel? selectedVariant;

  const ProductDetailLoaded({
    required this.product,
    this.selectedVariant,
  });

  /// Price to show — selected variant's price, or the product's lowest price.
  double get displayPrice => selectedVariant?.price ?? product.displayPrice;

  /// Whether the current selection (or default) is in stock.
  bool get isInStock {
    if (selectedVariant != null) return selectedVariant!.stock > 0;
    return product.isInStock;
  }

  ProductDetailLoaded copyWith({
    ProductModel? product,
    VariantModel? selectedVariant,
    bool clearVariant = false,
  }) {
    return ProductDetailLoaded(
      product: product ?? this.product,
      selectedVariant:
          clearVariant ? null : (selectedVariant ?? this.selectedVariant),
    );
  }

  @override
  List<Object?> get props => [product, selectedVariant];
}

class ProductDetailError extends ProductDetailState {
  final String message;
  final String productId;

  const ProductDetailError({required this.message, required this.productId});

  @override
  List<Object?> get props => [message, productId];
}
