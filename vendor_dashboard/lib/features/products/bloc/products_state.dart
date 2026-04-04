import 'package:equatable/equatable.dart';
import '../../../shared/models/product.dart';

abstract class ProductsState extends Equatable {
  const ProductsState();

  @override
  List<Object?> get props => [];
}

class ProductsInitial extends ProductsState {}

class ProductsLoading extends ProductsState {}

class ProductsLoaded extends ProductsState {
  final List<Product> products;
  final int total;
  final bool hasMore;

  const ProductsLoaded(
    this.products, {
    this.total = 0,
    this.hasMore = false,
  });

  @override
  List<Object?> get props => [products, total, hasMore];
}

class ProductsError extends ProductsState {
  final String message;

  const ProductsError(this.message);

  @override
  List<Object?> get props => [message];
}
