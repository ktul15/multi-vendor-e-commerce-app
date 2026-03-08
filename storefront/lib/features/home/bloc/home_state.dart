import 'package:equatable/equatable.dart';
import '../../../shared/models/category_model.dart';
import '../../../shared/models/product_model.dart';

sealed class HomeState extends Equatable {
  const HomeState();

  @override
  List<Object?> get props => [];
}

class HomeInitial extends HomeState {
  const HomeInitial();
}

class HomeLoading extends HomeState {
  const HomeLoading();
}

class HomeLoaded extends HomeState {
  final List<CategoryModel> categories;
  final List<ProductModel> trendingProducts;
  final List<ProductModel> newArrivals;

  const HomeLoaded({
    required this.categories,
    required this.trendingProducts,
    required this.newArrivals,
  });

  @override
  List<Object?> get props => [categories, trendingProducts, newArrivals];
}

class HomeError extends HomeState {
  final String message;

  const HomeError(this.message);

  @override
  List<Object?> get props => [message];
}
