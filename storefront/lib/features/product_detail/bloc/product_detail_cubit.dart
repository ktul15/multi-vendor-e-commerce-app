import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../repositories/product_detail_repository.dart';
import '../../../shared/models/product_model.dart';
import 'product_detail_state.dart';

class ProductDetailCubit extends Cubit<ProductDetailState> {
  final ProductDetailRepository _repository;

  ProductDetailCubit({required ProductDetailRepository repository})
      : _repository = repository,
        super(const ProductDetailInitial());

  Future<void> loadProduct(String id) async {
    if (state is ProductDetailLoading) return;
    emit(const ProductDetailLoading());
    try {
      final product = await _repository.getProductById(id);
      emit(ProductDetailLoaded(product: product));
    } on DioException catch (e) {
      final message = e.response?.data?['message'] as String? ??
          _friendlyMessage(e.type);
      emit(ProductDetailError(message: message, productId: id));
    } catch (e) {
      emit(ProductDetailError(message: e.toString(), productId: id));
    }
  }

  void selectVariant(VariantModel? variant) {
    final current = state;
    if (current is! ProductDetailLoaded) return;
    emit(current.copyWith(
      selectedVariant: variant,
      clearVariant: variant == null,
    ));
  }

  String _friendlyMessage(DioExceptionType type) => switch (type) {
        DioExceptionType.connectionTimeout ||
        DioExceptionType.receiveTimeout ||
        DioExceptionType.sendTimeout =>
          'Connection timed out. Check your internet and try again.',
        DioExceptionType.connectionError =>
          'No internet connection. Please try again.',
        _ => 'Something went wrong. Please try again.',
      };
}
