import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../repositories/product_repository.dart';
import 'products_state.dart';

class ProductsCubit extends Cubit<ProductsState> {
  final ProductRepository _productRepository;
  final String _vendorId;

  static const int _pageSize = 100; // backend max
  int _currentPage = 1;

  ProductsCubit({
    required ProductRepository productRepository,
    required String vendorId,
  })  : _productRepository = productRepository,
        _vendorId = vendorId,
        super(ProductsInitial());

  Future<void> load() async {
    _currentPage = 1;
    emit(ProductsLoading());
    try {
      final result = await _productRepository.getVendorProducts(
        _vendorId,
        page: 1,
        limit: _pageSize,
      );
      emit(ProductsLoaded(
        result.products,
        total: result.total,
        hasMore: result.totalPages > 1,
      ));
    } catch (e) {
      emit(ProductsError(e.toString()));
    }
  }

  Future<void> loadMore() async {
    final current = state;
    if (current is! ProductsLoaded || !current.hasMore) return;
    _currentPage++;
    try {
      final result = await _productRepository.getVendorProducts(
        _vendorId,
        page: _currentPage,
        limit: _pageSize,
      );
      final merged = [...current.products, ...result.products];
      emit(ProductsLoaded(
        merged,
        total: result.total,
        hasMore: _currentPage < result.totalPages,
      ));
    } catch (e) {
      emit(ProductsError(e.toString()));
    }
  }

  Future<void> createProduct({
    required String name,
    required String description,
    required double basePrice,
    required String categoryId,
    bool isActive = true,
  }) async {
    try {
      await _productRepository.createProduct(
        name: name,
        description: description,
        basePrice: basePrice,
        categoryId: categoryId,
        isActive: isActive,
      );
      await load();
    } catch (e) {
      emit(ProductsError(e.toString()));
    }
  }

  Future<void> updateProduct(
    String productId, {
    String? name,
    String? description,
    double? basePrice,
    bool? isActive,
  }) async {
    try {
      await _productRepository.updateProduct(
        productId,
        name: name,
        description: description,
        basePrice: basePrice,
        isActive: isActive,
      );
      await load();
    } catch (e) {
      emit(ProductsError(e.toString()));
    }
  }

  Future<void> deleteProduct(String productId) async {
    try {
      await _productRepository.deleteProduct(productId);
      await load();
    } catch (e) {
      emit(ProductsError(e.toString()));
    }
  }
}
